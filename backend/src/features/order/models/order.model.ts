import { db } from "../../../shared/config/firebase";
import { Order, Product, Review } from "../../../shared/types";
import { v4 as uuidv4 } from "uuid";
import { calculateReviewStats } from "../../product/models/product.model";

export const createOrderModel = async (input: {
  userId: string;
  productId: string;
  productName: string;
  price: number;
  imageUrl?: string | null;
}): Promise<Order> => {
  const existingSnapshot = await db
    .collection("orders")
    .where("user_id", "==", input.userId)
    .where("product_id", "==", input.productId)
    .limit(1)
    .get();

  if (!existingSnapshot.empty) {
    return existingSnapshot.docs[0].data() as Order;
  }

  const now = new Date().toISOString();
  const order: Order = {
    id: uuidv4(),
    user_id: input.userId,
    product_id: input.productId,
    product_name: input.productName,
    price: input.price,
    image_url: input.imageUrl || null,
    status: "purchased",
    is_reviewed: false,
    review_id: null,
    purchased_at: now,
    reviewed_at: null,
    created_at: now,
    updated_at: now,
  };

  await db.collection("orders").doc(order.id).set(order);
  return order;
};

export const getUserOrdersModel = async (userId: string): Promise<Order[]> => {
  const snapshot = await db
    .collection("orders")
    .where("user_id", "==", userId)
    .get();

  const orders = snapshot.docs.map((doc) => doc.data() as Order);
  return orders.sort(
    (a, b) =>
      new Date(b.purchased_at).getTime() - new Date(a.purchased_at).getTime(),
  );
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
  const orderSnapshot = await db
    .collection("orders")
    .where("user_id", "==", input.userId)
    .where("product_id", "==", input.productId)
    .limit(1)
    .get();

  if (orderSnapshot.empty) {
    throw new Error("ORDER_NOT_FOUND");
  }

  const orderDoc = orderSnapshot.docs[0];
  const order = orderDoc.data() as Order;

  if (order.is_reviewed) {
    const existingReviewDoc = await db
      .collection("product_reviews")
      .doc(order.review_id || "")
      .get();
    if (existingReviewDoc.exists) {
      return existingReviewDoc.data() as Review;
    }
  }

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
  await orderDoc.ref.update({
    is_reviewed: true,
    reviewed_at: now,
    review_id: review.id,
    updated_at: now,
  });

  const productDoc = await db.collection("products").doc(input.productId).get();
  if (productDoc.exists) {
    const existingProduct = productDoc.data() as Product;
    const allReviewsSnapshot = await db
      .collection("product_reviews")
      .where("product_id", "==", input.productId)
      .get();
    const allReviews = allReviewsSnapshot.docs.map(
      (doc) => doc.data() as Review,
    );
    const stats = calculateReviewStats(allReviews);

    await productDoc.ref.update({
      rating: stats.rating,
      reviews: stats.reviews,
      updated_at: now,
    });

    if (
      !existingProduct.rating ||
      existingProduct.rating !== stats.rating ||
      existingProduct.reviews !== stats.reviews
    ) {
      await productDoc.ref.update({
        rating: stats.rating,
        reviews: stats.reviews,
        updated_at: now,
      });
    }
  }

  return review;
};
