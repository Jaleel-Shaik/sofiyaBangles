import { db } from "../../../shared/config/firebase";
import { Order, OrderItem, Product, ProductVariant, Review } from "../../../shared/types";
import { v4 as uuidv4 } from "uuid";
import { createRevenueAllocationModel, createRefundReversalModel } from "./revenueLedger.model";
import { createAuditLogModel } from "../../../shared/models/audit.model";

export const createOrderModel = async (input: {
  userId: string;
  items: {
    productId?: string;
    product_id?: string;
    variantId?: string | null;
    variant_id?: string | null;
    quantity: number;
    price?: number;
    product_name?: string;
    size?: string;
    image_url?: string | null;
  }[];
  shippingAddressSnapshot?: any;
}): Promise<Order> => {
  // We need to fetch product info for snapshots, calculate totals, and save atomically
  const now = new Date().toISOString();
  
  let subtotal = 0;
  const orderItemsData: any[] = [];
  
  // Doing reads first for the transaction equivalent (using batch later)
  for (const item of input.items) {
    const prodId = item.productId || item.product_id;
    if (!prodId) {
      throw new Error("PRODUCT_ID_REQUIRED");
    }
    const variantId = item.variantId || item.variant_id || null;
    const itemQuantity = Number(item.quantity) || 1;

    const pDoc = await db.collection("products").doc(prodId).get();
    if (!pDoc.exists) {
      throw new Error(`PRODUCT_NOT_FOUND: ${prodId}`);
    }
    const pData = pDoc.data() as Product;
    if (pData.is_active === false) {
      throw new Error(`PRODUCT_NOT_AVAILABLE: ${prodId}`);
    }

    let itemPrice = Number(item.price) || pData.price;
    let skuSnapshot = null;

    if (variantId) {
      const vDoc = await db.collection("product_variants").doc(variantId).get();
      if (!vDoc.exists) {
        throw new Error(`VARIANT_NOT_FOUND: ${variantId}`);
      }
      const vData = vDoc.data() as ProductVariant;
      itemPrice = vData.price;
      skuSnapshot = vData.sku || null;
      
      if (vData.quantity < itemQuantity) {
         throw new Error(`INSUFFICIENT_STOCK_FOR_VARIANT: ${variantId}`);
      }
    } else {
      if (pData.quantity < itemQuantity) {
         throw new Error(`INSUFFICIENT_STOCK_FOR_PRODUCT: ${prodId}`);
      }
    }

    let catNameSnapshot = "General";
    if (pData.category_id) {
      const catDoc = await db.collection("categories").doc(pData.category_id).get();
      if (catDoc.exists) {
        catNameSnapshot = catDoc.data()?.category_name || "General";
      }
    }

    const itemSubtotal = itemPrice * itemQuantity;
    subtotal += itemSubtotal;

    orderItemsData.push({
      productId: prodId,
      variantId: variantId,
      categoryId: pData.category_id,
      categoryNameSnapshot: catNameSnapshot,
      productNameSnapshot: pData.product_name,
      skuSnapshot: skuSnapshot,
      priceSnapshot: itemPrice,
      quantity: itemQuantity,
      subtotal: itemSubtotal
    });
  }

  const orderId = uuidv4();
  
  // Create Order
  const order: Order = {
    id: orderId,
    user_id: input.userId,
    order_number: `ORD-${Date.now().toString().slice(-6)}`,
    status: "pending",
    payment_status: "pending",
    subtotal,
    discount: 0,
    shipping_amount: 0, // Placeholder
    tax_amount: 0, // Placeholder
    total_amount: subtotal,
    shipping_address_snapshot: input.shippingAddressSnapshot || null,
    created_at: now,
    updated_at: now,
  };

  const batch = db.batch();
  batch.set(db.collection("orders").doc(order.id), order);

  // Create Order Items and decrease stock
  orderItemsData.forEach(itemData => {
    const oItemId = uuidv4();
    const orderItem: OrderItem = {
      id: oItemId,
      order_id: orderId,
      product_id: itemData.productId,
      variant_id: itemData.variantId,
      category_id: itemData.categoryId,
      category_name_snapshot: itemData.categoryNameSnapshot,
      product_name_snapshot: itemData.productNameSnapshot,
      sku_snapshot: itemData.skuSnapshot,
      price_snapshot: itemData.priceSnapshot,
      quantity: itemData.quantity,
      subtotal: itemData.subtotal,
      final_unit_price: itemData.priceSnapshot,
      final_amount: itemData.subtotal,
      created_at: now
    };
    batch.set(db.collection("order_items").doc(oItemId), orderItem);

    // Decrease stock
    if (itemData.variantId) {
       const vRef = db.collection("product_variants").doc(itemData.variantId);
       batch.update(vRef, { 
         quantity: FirebaseFirestore.FieldValue.increment(-itemData.quantity),
         updated_at: now
       });
    } else {
       const pRef = db.collection("products").doc(itemData.productId);
       batch.update(pRef, { 
         quantity: FirebaseFirestore.FieldValue.increment(-itemData.quantity),
         updated_at: now
       });
    }
  });

  await batch.commit();

  // Audit log each sold item for Product Operations Log
  for (const itemData of orderItemsData) {
    createAuditLogModel({
      actor_id: input.userId,
      action: "PRODUCT_SOLD",
      table_name: "products",
      record_id: itemData.productId,
      new_data: {
        product_name: itemData.productNameSnapshot,
        quantity_sold: itemData.quantity,
        order_number: order.order_number,
        price: itemData.priceSnapshot,
      },
    }).catch((err) => console.warn("Failed to audit log PRODUCT_SOLD:", err));
  }

  return order;
};

export const getOrderByIdModel = async (orderId: string): Promise<Order | null> => {
  const doc = await db.collection("orders").doc(orderId).get();
  if (!doc.exists) return null;
  return doc.data() as Order;
};

export const getUserOrdersModel = async (userId: string): Promise<Order[]> => {
  const snapshot = await db
    .collection("orders")
    .where("user_id", "==", userId)
    .get();

  const orders = snapshot.docs.map((doc) => doc.data() as Order);
  return orders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
};

export const getAllAdminOrdersModel = async (options: {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
}): Promise<{ orders: Order[]; total: number }> => {
  const page = Math.max(1, options.page || 1);
  const limit = Math.max(1, Math.min(100, options.limit || 20));

  let query: FirebaseFirestore.Query = db.collection("orders");
  if (options.status) {
    query = query.where("status", "==", options.status);
  }

  const snapshot = await query.get();
  let orders = snapshot.docs.map((doc) => doc.data() as Order);

  if (options.search) {
    const s = options.search.toLowerCase();
    orders = orders.filter(
      (o) =>
        (o.order_number || "").toLowerCase().includes(s) ||
        (o.id || "").toLowerCase().includes(s) ||
        (o.user_id || "").toLowerCase().includes(s) ||
        ((o.shipping_address_snapshot as any)?.full_name || "").toLowerCase().includes(s) ||
        ((o.shipping_address_snapshot as any)?.phone || "").toLowerCase().includes(s)
    );
  }

  orders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const total = orders.length;
  const offset = (page - 1) * limit;
  const paginatedOrders = orders.slice(offset, offset + limit);

  return { orders: paginatedOrders, total };
};

export const getOrderItemsModel = async (orderId: string): Promise<OrderItem[]> => {
  const snapshot = await db
    .collection("order_items")
    .where("order_id", "==", orderId)
    .get();
    
  return snapshot.docs.map(doc => doc.data() as OrderItem);
};

export const getProductReviewsModel = async (
  productId: string,
): Promise<Review[]> => {
  const snapshot = await db
    .collection("product_reviews")
    .where("product_id", "==", productId)
    .get();

  const reviews = snapshot.docs.map((doc) => doc.data() as Review);
  return reviews.sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
};

export const createReviewModel = async (input: {
  userId: string;
  productId: string;
  rating: number;
  comment?: string | null;
  damageDetails?: string | null;
}): Promise<Review> => {
  // Check if user has ordered this product (via order_items)
  const ordersSnapshot = await db
    .collection("orders")
    .where("user_id", "==", input.userId)
    .get();

  if (ordersSnapshot.empty) {
    throw new Error("ORDER_NOT_FOUND");
  }

  const orderIds = ordersSnapshot.docs.map(d => d.id);
  
  // Need to check if product exists in any of these orders' items
  // Since Firestore 'in' has a limit of 10, we'll fetch items where product_id matches and filter by orderIds locally if it's large,
  // or query by order_id if orderIds is small. Let's query by product_id since it's an indexed field (probably)
  const orderItemsSnapshot = await db
    .collection("order_items")
    .where("product_id", "==", input.productId)
    .get();

  const matchingItem = orderItemsSnapshot.docs.find(doc => orderIds.includes(doc.data().order_id));

  if (!matchingItem) {
    throw new Error("ORDER_NOT_FOUND");
  }

  // Simplified review creation
  const now = new Date().toISOString();
  const review: Review = {
    id: uuidv4(),
    user_id: input.userId,
    product_id: input.productId,
    rating: input.rating,
    comment: input.comment || null,
    damage_details: input.damageDetails || null,
    created_at: now,
    updated_at: now,
  };

  await db.collection("product_reviews").doc(review.id).set(review);

  return review;
};

/**
 * Transitions an order to completed, triggers 70/30 revenue ledger allocations,
 * and emits notifications + audit logs.
 */
export const completeOrderModel = async (
  orderId: string,
  actorId: string
): Promise<Order> => {
  const orderRef = db.collection("orders").doc(orderId);
  const doc = await orderRef.get();
  if (!doc.exists) {
    throw new Error("ORDER_NOT_FOUND");
  }

  const order = doc.data() as Order;
  if (order.status === "completed" && order.payment_status === "paid") {
    // Idempotent: already completed
    return order;
  }

  const now = new Date().toISOString();
  const updatedOrder: Order = {
    ...order,
    status: "completed",
    payment_status: "paid",
    completed_at: now,
    updated_at: now,
  };

  await orderRef.update({
    status: "completed",
    payment_status: "paid",
    completed_at: now,
    updated_at: now,
  });

  // Fetch items for this order and allocate revenue for each item
  const items = await getOrderItemsModel(orderId);
  for (const item of items) {
    await createRevenueAllocationModel({
      orderId: order.id,
      orderItemId: item.id,
      productId: item.product_id,
      grossAmount: item.subtotal || item.price_snapshot * item.quantity,
      transactionType: "SALE",
      notes: `Sale completed for ${item.product_name_snapshot}`,
    });
  }

  // Create Notification for SuperAdmin
  const notifId = uuidv4();
  await db.collection("notifications").doc(notifId).set({
    id: notifId,
    title: `New Sale Completed: ${order.order_number}`,
    body: `Order ${order.order_number} for ₹${order.total_amount} was completed successfully.`,
    type: "NEW_SALE",
    product_id: null,
    sent_by: actorId,
    user_id: null,
    is_read: false,
    created_at: now,
  });

  // Audit Logs
  await createAuditLogModel({
    actor_id: actorId,
    action: "ORDER_COMPLETED",
    table_name: "orders",
    record_id: orderId,
    old_data: { status: order.status, payment_status: order.payment_status },
    new_data: { status: "completed", payment_status: "paid" },
  });

  await createAuditLogModel({
    actor_id: actorId,
    action: "REVENUE_ALLOCATED",
    table_name: "revenue_ledger",
    record_id: orderId,
    new_data: { order_number: order.order_number, total_amount: order.total_amount },
  });

  return updatedOrder;
};

/**
 * Transitions an order to refunded, triggers reversal revenue ledger allocations,
 * and emits notifications + audit logs.
 */
export const refundOrderModel = async (
  orderId: string,
  actorId: string,
  reason?: string
): Promise<Order> => {
  const orderRef = db.collection("orders").doc(orderId);
  const doc = await orderRef.get();
  if (!doc.exists) {
    throw new Error("ORDER_NOT_FOUND");
  }

  const order = doc.data() as Order;
  if (order.payment_status === "refunded") {
    // Idempotent: already refunded
    return order;
  }

  const now = new Date().toISOString();
  const updatedOrder: Order = {
    ...order,
    status: "returned",
    payment_status: "refunded",
    refunded_at: now,
    refund_reason: reason || "Admin refund initiated",
    updated_at: now,
  };

  await orderRef.update({
    status: "returned",
    payment_status: "refunded",
    refunded_at: now,
    refund_reason: reason || "Admin refund initiated",
    updated_at: now,
  });

  // Create refund reversals in revenue ledger
  await createRefundReversalModel(orderId, reason);

  // Create Notification for SuperAdmin
  const notifId = uuidv4();
  await db.collection("notifications").doc(notifId).set({
    id: notifId,
    title: `Order Refunded: ${order.order_number}`,
    body: `Refund processed for order ${order.order_number} (₹${order.total_amount}). Reason: ${reason || "N/A"}.`,
    type: "REFUND",
    product_id: null,
    sent_by: actorId,
    user_id: null,
    is_read: false,
    created_at: now,
  });

  // Audit Logs
  await createAuditLogModel({
    actor_id: actorId,
    action: "ORDER_REFUNDED",
    table_name: "orders",
    record_id: orderId,
    old_data: { payment_status: order.payment_status },
    new_data: { payment_status: "refunded", refund_reason: reason },
  });

  await createAuditLogModel({
    actor_id: actorId,
    action: "REVENUE_REVERSED",
    table_name: "revenue_ledger",
    record_id: orderId,
    new_data: { order_number: order.order_number, total_amount: order.total_amount },
  });

  return updatedOrder;
};

/**
 * Updates an order's status (e.g., processing, shipped, delivered, cancelled)
 */
export const updateOrderStatusModel = async (
  orderId: string,
  actorId: string,
  newStatus: string,
  notes?: string
): Promise<Order> => {
  const orderRef = db.collection("orders").doc(orderId);
  const doc = await orderRef.get();
  if (!doc.exists) {
    throw new Error("ORDER_NOT_FOUND");
  }

  const order = doc.data() as Order;

  if (newStatus === "completed" && order.status !== "completed") {
    return completeOrderModel(orderId, actorId);
  }

  if (newStatus === "refunded" && order.payment_status !== "refunded") {
    return refundOrderModel(orderId, actorId, notes);
  }

  const now = new Date().toISOString();
  const updateData: any = {
    status: newStatus,
    updated_at: now,
  };
  if (notes) {
    updateData.admin_notes = notes;
  }

  await orderRef.update(updateData);

  await createAuditLogModel({
    actor_id: actorId,
    action: "ORDER_STATUS_UPDATED",
    table_name: "orders",
    record_id: orderId,
    old_data: { status: order.status },
    new_data: { status: newStatus, notes },
  });

  return { ...order, ...updateData };
};


