import { db } from "../shared/config/firebase";
import { FieldValue } from "firebase-admin/firestore";
import { Order, OrderItem, Review } from "../shared/types";

export interface StockDeductionItem {
  type?: "variant" | "product";
  id?: string;
  variantId?: string;
  productId?: string;
  quantity: number;
}

/**
 * Pure Database Operation: Atomically save an order, its items, and deduct variant/product stocks
 * inside a database transaction to prevent concurrency race conditions and negative inventory.
 */
export const insertOrderWithItemsDb = async (
  order: Order,
  items: OrderItem[],
  stockDeductions: StockDeductionItem[]
): Promise<Order> => {
  const sanitizeDoc = (obj: any) => {
    const clean: any = {};
    Object.keys(obj).forEach((k) => {
      if (obj[k] !== undefined) clean[k] = obj[k];
    });
    return clean;
  };

  await db.runTransaction(async (transaction) => {
    // 1. Transactional Reads: Verify all stock availability before committing writes
    const readDocs: Array<{
      ref: FirebaseFirestore.DocumentReference;
      currentQty: number;
      deductQty: number;
      id: string;
      isVariant: boolean;
    }> = [];

    for (const deduction of stockDeductions) {
      const isVariant = deduction.type === "variant" || deduction.variantId !== undefined;
      const targetId = deduction.id || (isVariant ? deduction.variantId : deduction.productId);

      if (targetId) {
        const ref = isVariant
          ? db.collection("product_variants").doc(targetId)
          : db.collection("products").doc(targetId);

        const snap = await transaction.get(ref);
        if (!snap.exists) {
          throw new Error(`ITEM_NOT_FOUND: Record ${targetId} was not found.`);
        }
        const currentQty = Number(snap.data()?.quantity) || 0;
        if (currentQty < deduction.quantity) {
          throw new Error(
            `INSUFFICIENT_STOCK: Item only has ${currentQty} units available, cannot fulfill ${deduction.quantity}.`
          );
        }

        readDocs.push({
          ref,
          currentQty,
          deductQty: deduction.quantity,
          id: targetId,
          isVariant,
        });
      }
    }

    // 2. Transactional Writes: Deduct stock and commit order + items
    const now = new Date().toISOString();
    for (const docInfo of readDocs) {
      transaction.update(docInfo.ref, {
        quantity: docInfo.currentQty - docInfo.deductQty,
        updated_at: now,
      });
    }

    // 3. Set order document
    transaction.set(db.collection("orders").doc(order.id), sanitizeDoc(order));

    // 4. Set order items documents
    items.forEach((item) => {
      transaction.set(db.collection("order_items").doc(item.id), sanitizeDoc(item));
    });
  });

  return order;
};


/**
 * Pure Database Operation: Retrieve order by ID or Order Number.
 */
export const getOrderByIdDb = async (id: string): Promise<Order | null> => {
  if (!id) return null;
  const cleanId = id.trim();
  const doc = await db.collection("orders").doc(cleanId).get();
  if (doc.exists) return doc.data() as Order;

  // Fallback: Check if the string passed is an order_number (e.g. ORD-123456 or #ORD-123456)
  return await getOrderByOrderNumberDb(cleanId);
};

/**
 * Pure Database Operation: Retrieve order by its unique order number (e.g. ORD-123456).
 */
export const getOrderByOrderNumberDb = async (orderNumber: string): Promise<Order | null> => {
  if (!orderNumber) return null;
  const clean = orderNumber.replace(/^#/, "").trim();

  // Try exact match with stripped hash
  let snapshot = await db
    .collection("orders")
    .where("order_number", "==", clean)
    .limit(1)
    .get();

  if (!snapshot.empty) return snapshot.docs[0].data() as Order;

  // Try match with leading hash
  snapshot = await db
    .collection("orders")
    .where("order_number", "==", `#${clean}`)
    .limit(1)
    .get();

  if (!snapshot.empty) return snapshot.docs[0].data() as Order;

  return null;
};

/**
 * Pure Database Operation: Retrieve all orders for a user.
 * Also searches by the customer's phone number to seamlessly claim/retrieve orders
 * placed via WhatsApp or Unique ID Quick Sell.
 */
export const getUserOrdersDb = async (userId: string, userPhone?: string | null): Promise<Order[]> => {
  const ordersMap = new Map<string, Order>();

  // 1. Fetch orders directly by user_id
  const snapshot = await db
    .collection("orders")
    .where("user_id", "==", userId)
    .get();

  snapshot.docs.forEach((doc) => {
    const data = doc.data() as Order;
    ordersMap.set(data.id, data);
  });

  // 2. Fetch orders matching the customer's phone number if provided
  if (userPhone && userPhone.trim()) {
    const rawClean = userPhone.trim();
    const digits = rawClean.replace(/\D/g, "");
    const last10 = digits.length >= 10 ? digits.slice(-10) : digits;
    const e164 = last10.length === 10 ? `91${last10}` : digits;
    const plusE164 = `+${e164}`;

    const candidates = Array.from(
      new Set([rawClean, digits, last10, e164, plusE164, `+91${last10}`, `+91 ${last10}`])
    ).filter(Boolean);

    for (const cand of candidates) {
      try {
        const phoneSnap = await db
          .collection("orders")
          .where("customer_phone", "==", cand)
          .get();

        for (const doc of phoneSnap.docs) {
          const data = doc.data() as Order;
          // Claim order if not already claimed by this user
          if (data.user_id !== userId) {
            db.collection("orders").doc(doc.id).update({ user_id: userId, updated_at: new Date().toISOString() }).catch(() => {});
            data.user_id = userId;
          }
          ordersMap.set(data.id, data);
        }
      } catch {
        // Ignore single candidate lookup errors
      }
    }
  }

  const orders = Array.from(ordersMap.values());
  orders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  return orders;
};

/**
 * Pure Database Operation: Retrieve paginated orders for admin.
 */
export const getAllAdminOrdersDb = async (options?: {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
}): Promise<{ orders: Order[]; total: number }> => {
  const page = Math.max(1, options?.page || 1);
  const limit = Math.max(1, Math.min(1000, options?.limit || 20));

  let query: FirebaseFirestore.Query = db.collection("orders");

  if (options?.status) {
    query = query.where("status", "==", options.status);
  }

  const snapshot = await query.get();
  let orders = snapshot.docs.map((doc) => doc.data() as Order);

  if (options?.search) {
    const s = options.search.toLowerCase().trim();
    const cleanSearch = s.replace(/^#/, "");
    orders = orders.filter(
      (o) =>
        (o.id && (o.id.toLowerCase() === s || o.id.toLowerCase().includes(s))) ||
        (o.order_number && (
          o.order_number.toLowerCase().includes(s) ||
          o.order_number.toLowerCase().replace(/^#/, "").includes(cleanSearch)
        )) ||
        (o.customer_name && o.customer_name.toLowerCase().includes(s)) ||
        (o.customer_phone && o.customer_phone.toLowerCase().includes(s)) ||
        (o.shipping_address_snapshot?.name &&
          o.shipping_address_snapshot.name.toLowerCase().includes(s)) ||
        ((o.shipping_address_snapshot as any)?.full_name &&
          (o.shipping_address_snapshot as any).full_name.toLowerCase().includes(s)) ||
        (o.shipping_address_snapshot?.phone &&
          o.shipping_address_snapshot.phone.toLowerCase().includes(s))
    );
  }

  orders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const total = orders.length;
  const offset = (page - 1) * limit;
  const paginatedOrders = orders.slice(offset, offset + limit);

  return { orders: paginatedOrders, total };
};

/**
 * Pure Database Operation: Retrieve all items for an order.
 */
export const getOrderItemsDb = async (orderId: string): Promise<OrderItem[]> => {
  const snapshot = await db
    .collection("order_items")
    .where("order_id", "==", orderId)
    .get();

  return snapshot.docs.map((doc) => doc.data() as OrderItem);
};

/**
 * Pure Database Operation: Update an existing order document.
 */
export const updateOrderDocDb = async (
  id: string,
  data: Partial<Order>
): Promise<void> => {
  const updateData: Record<string, unknown> = {
    ...data,
    updated_at: new Date().toISOString(),
  };
  Object.keys(updateData).forEach((key) => updateData[key] === undefined && delete updateData[key]);

  await db.collection("orders").doc(id).update(updateData);
};

/**
 * Pure Database Operation: Retrieve product reviews.
 */
export const getProductReviewsDb = async (productId: string): Promise<Review[]> => {
  const snapshot = await db
    .collection("product_reviews")
    .where("product_id", "==", productId)
    .get();

  const reviews = snapshot.docs.map((doc) => doc.data() as Review);
  reviews.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  return reviews;
};

/**
 * Pure Database Operation: Insert a review document.
 */
export const insertReviewDb = async (review: Review): Promise<Review> => {
  await db.collection("product_reviews").doc(review.id).set(review);
  return review;
};

/**
 * Pure Database Operation: Retrieve all reviews for admin.
 */
export const getAllReviewsForAdminDb = async (): Promise<Review[]> => {
  const snapshot = await db.collection("product_reviews").get();
  const reviews = snapshot.docs.map((doc) => doc.data() as Review);
  reviews.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  return reviews;
};

/**
 * Pure Database Operation: Mark an order item as reviewed.
 */
export const markOrderItemReviewedDb = async (
  orderId: string | null | undefined,
  productId: string,
  reviewId: string
): Promise<void> => {
  let query: FirebaseFirestore.Query = db.collection("order_items").where("product_id", "==", productId);
  if (orderId) {
    query = query.where("order_id", "==", orderId);
  }
  const snapshot = await query.limit(1).get();
  if (!snapshot.empty) {
    await snapshot.docs[0].ref.update({
      is_reviewed: true,
      review_id: reviewId,
      updated_at: new Date().toISOString(),
    });
  }
};

/**
 * Pure Database Operation: Find purchased order items for a user and product.
 * Permits rating for any non-cancelled order placed by the user.
 */
export const findUserOrderItemsForProductDb = async (
  userId: string,
  productId: string,
  orderId?: string | null
): Promise<OrderItem[]> => {
  let ordersSnap: FirebaseFirestore.QuerySnapshot;
  if (orderId) {
    const singleOrderDoc = await db.collection("orders").doc(orderId).get();
    if (!singleOrderDoc.exists) return [];
    const data = singleOrderDoc.data();
    if (data?.user_id !== userId || data?.status === "cancelled") return [];
    ordersSnap = {
      empty: false,
      docs: [singleOrderDoc],
    } as any;
  } else {
    ordersSnap = await db
      .collection("orders")
      .where("user_id", "==", userId)
      .get();
  }

  if (ordersSnap.empty) return [];

  // Valid orders are those not cancelled
  const validOrderIds = ordersSnap.docs
    .filter((d) => d.data().status !== "cancelled")
    .map((d) => d.id);

  if (validOrderIds.length === 0) return [];

  const itemsSnap = await db
    .collection("order_items")
    .where("product_id", "==", productId)
    .get();

  return itemsSnap.docs
    .map((d) => d.data() as OrderItem)
    .filter((i) => validOrderIds.includes(i.order_id));
};

/**
 * Pure Database Operation: Delete an order and its items and revenue entries atomically.
 */
export const deleteOrderDb = async (orderId: string): Promise<void> => {
  const batch = db.batch();

  // Delete order doc
  const orderRef = db.collection("orders").doc(orderId);
  batch.delete(orderRef);

  // Delete order_items
  const itemsSnap = await db.collection("order_items").where("order_id", "==", orderId).get();
  itemsSnap.docs.forEach((d) => batch.delete(d.ref));

  // Delete revenue_ledger
  const revSnap = await db.collection("revenue_ledger").where("order_id", "==", orderId).get();
  revSnap.docs.forEach((d) => batch.delete(d.ref));

  await batch.commit();
};
