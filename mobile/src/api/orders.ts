import { apiClient } from "./client";

export interface OrderItem {
  id: string;
  user_id: string;
  product_id: string;
  product_name: string;
  price: number;
  image_url: string | null;
  status: string;
  is_reviewed: boolean;
  review_id: string | null;
  purchased_at: string;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReviewPayload {
  productId: string;
  rating: number;
  comment?: string | null;
  damageDetails?: string | null;
}

export const createOrder = async (payload: {
  productId: string;
  productName: string;
  price: number;
  imageUrl?: string | null;
}) => {
  const res = await apiClient.post("orders", payload);
  return res.data.data as OrderItem;
};

export const getUserOrders = async () => {
  const res = await apiClient.get("orders");
  const data = Array.isArray(res.data?.data) ? res.data.data : [];
  return data as OrderItem[];
};

export const createReview = async (payload: ReviewPayload) => {
  const res = await apiClient.post("orders/reviews", payload);
  return res.data.data;
};

export const getProductReviews = async (productId: string) => {
  const res = await apiClient.get(`orders/products/${productId}/reviews`);
  return res.data.data as {
    id: string;
    rating: number;
    comment: string | null;
    damage_details: string | null;
    created_at: string;
  }[];
};
