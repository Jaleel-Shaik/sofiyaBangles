import { db } from "../../../shared/config/firebase";
import { Order, OrderItem, Product, ProductVariant, Review } from "../../../shared/types";
import { v4 as uuidv4 } from "uuid";

export const createOrderModel = async (input: {
  userId: string;
  items: {
    productId: string;
    variantId?: string | null;
    quantity: number;
  }[];
  shippingAddressSnapshot?: any;
}): Promise<Order> => {
  // We need to fetch product info for snapshots, calculate totals, and save atomically
  const now = new Date().toISOString();
  
  let subtotal = 0;
  const orderItemsData: any[] = [];
  
  // Doing reads first for the transaction equivalent (using batch later)
  for (const item of input.items) {
    const pDoc = await db.collection("products").doc(item.productId).get();
    if (!pDoc.exists) {
      throw new Error(`PRODUCT_NOT_FOUND: ${item.productId}`);
    }
    const pData = pDoc.data() as Product;
    if (pData.is_active === false) {
      throw new Error(`PRODUCT_NOT_AVAILABLE: ${item.productId}`);
    }

    let itemPrice = pData.price;
    let skuSnapshot = null;

    if (item.variantId) {
      const vDoc = await db.collection("product_variants").doc(item.variantId).get();
      if (!vDoc.exists) {
        throw new Error(`VARIANT_NOT_FOUND: ${item.variantId}`);
      }
      const vData = vDoc.data() as ProductVariant;
      itemPrice = vData.price;
      skuSnapshot = vData.sku || null;
      
      if (vData.quantity < item.quantity) {
         throw new Error(`INSUFFICIENT_STOCK_FOR_VARIANT: ${item.variantId}`);
      }
    } else {
      if (pData.quantity < item.quantity) {
         throw new Error(`INSUFFICIENT_STOCK_FOR_PRODUCT: ${item.productId}`);
      }
    }

    const itemSubtotal = itemPrice * item.quantity;
    subtotal += itemSubtotal;

    orderItemsData.push({
      productId: item.productId,
      variantId: item.variantId || null,
      productNameSnapshot: pData.product_name,
      skuSnapshot: skuSnapshot,
      priceSnapshot: itemPrice,
      quantity: item.quantity,
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
      product_name_snapshot: itemData.productNameSnapshot,
      sku_snapshot: itemData.skuSnapshot,
      price_snapshot: itemData.priceSnapshot,
      quantity: itemData.quantity,
      subtotal: itemData.subtotal,
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

  return order;
};

export const getUserOrdersModel = async (userId: string): Promise<Order[]> => {
  const snapshot = await db
    .collection("orders")
    .where("user_id", "==", userId)
    .get();

  const orders = snapshot.docs.map((doc) => doc.data() as Order);
  return orders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
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

