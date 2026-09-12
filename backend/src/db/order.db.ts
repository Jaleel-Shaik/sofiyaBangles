import { db } from "../shared/config/firebase";
import { Order, OrderItem, Review } from "../shared/types";

export interface StockDeductionItem {
  type?: "variant" | "product";
  id?: string;
  variantId?: string;
  productId?: string;
  quantity: number;
}

/**
 * Pure Database Operation: Atomically save an order, its items, and deduct variant/product stocks.
 */
export const insertOrderWithItemsDb = async (
  order: Order,
  items: OrderItem[],
  stockDeductions: StockDeductionItem[]
): Promise<Order> => {
  const batch = db.batch();

  // 1. Order document
  batch.set(db.collection("orders").doc(order.id), order);

  // 2. Order items documents
  items.forEach((item) => {
    batch.set(db.collection("order_items").doc(item.id), item);
  });

  // 3. Stock deductions
  const now = new Date().toISOString();
  for (const deduction of stockDeductions) {
    const isVariant = deduction.type === "variant" || deduction.variantId !== undefined;
    const targetId = deduction.id || (isVariant ? deduction.variantId : deduction.productId);

    if (targetId) {
      if (isVariant) {
        const vRef = db.collection("product_variants").doc(targetId);
        batch.update(vRef, {
          quantity: FirebaseFirestore.FieldValue.increment(-deduction.quantity),
          updated_at: now,
        });
      } else {
        const pRef = db.collection("products").doc(targetId);
        batch.update(pRef, {
          quantity: FirebaseFirestore.FieldValue.increment(-deduction.quantity),
          updated_at: now,
        });
      }
    }
  }

  await batch.commit();
  return order;
};

/**
 * Pure Database Operation: Retrieve order by ID.
 */
export const getOrderByIdDb = async (id: string): Promise<Order | null> => {
  const doc = await db.collection("orders").doc(id).get();
  if (!doc.exists) return null;
  return doc.data() as Order;
};

/**
 * Pure Database Operation: Retrieve all orders for a user.
 */
export const getUserOrdersDb = async (userId: string): Promise<Order[]> => {
  const snapshot = await db
    .collection("orders")
    .where("user_id", "==", userId)
    .get();

  const orders = snapshot.docs.map((doc) => doc.data() as Order);
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
    const s = options.search.toLowerCase();
    orders = orders.filter(
      (o) =>
        (o.order_number && o.order_number.toLowerCase().includes(s)) ||
        (o.shipping_address_snapshot?.name &&
          o.shipping_address_snapshot.name.toLowerCase().includes(s))
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
 * Pure Database Operation: Find completed order items for a user and product.
 */
export const findUserOrderItemsForProductDb = async (
  userId: string,
  productId: string
): Promise<OrderItem[]> => {
  const ordersSnap = await db
    .collection("orders")
    .where("user_id", "==", userId)
    .where("status", "==", "completed")
    .get();

  if (ordersSnap.empty) return [];

  const completedOrderIds = ordersSnap.docs.map((d) => d.id);
  const itemsSnap = await db
    .collection("order_items")
    .where("product_id", "==", productId)
    .get();

  return itemsSnap.docs
    .map((d) => d.data() as OrderItem)
    .filter((i) => completedOrderIds.includes(i.order_id));
};
