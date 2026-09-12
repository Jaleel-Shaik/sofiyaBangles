import { API_ENDPOINTS } from "./endpoints";
import { apiClient } from "./client";

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  price: number;
  size?: string;
  color?: string;
  image_url?: string | null;
  status: string;
  is_reviewed: boolean;
  review_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: string;
  user_id: string;
  total_amount: number;
  status: string;
  shipping_address_snapshot?: any;
  items?: OrderItem[];
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
  items: {
    product_id: string;
    product_name: string;
    quantity: number;
    price: number;
    image_url?: string | null;
    size?: string;
    color?: string;
  }[];
  shippingAddressSnapshot?: any;
}) => {
  const res = await apiClient.post("orders", payload);
  return res.data.data as Order;
};

export const getUserOrders = async () => {
  const res = await apiClient.get("orders");
  const data = Array.isArray(res.data?.data) ? res.data.data : [];
  return data as Order[];
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
