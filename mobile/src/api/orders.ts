import { apiClient } from './client';

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

export interface ShippingAddress {
  name: string;
  phone: string;
  address_line1?: string;
  address_line2?: string;
  street?: string;
  city: string;
  state: string;
  pincode?: string;
  postal_code?: string;
  country?: string;
  [key: string]: unknown;
}

export interface Order {
  id: string;
  user_id: string;
  total_amount: number;
  status: string;
  shipping_address_snapshot?: ShippingAddress | null;
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

export interface OrderReview {
  id: string;
  rating: number;
  comment: string | null;
  damage_details: string | null;
  created_at: string;
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
  shippingAddressSnapshot?: ShippingAddress;
}): Promise<Order> => {
  const res = await apiClient.post('orders', payload);
  return res.data.data as Order;
};

export const getUserOrders = async (): Promise<Order[]> => {
  try {
    const res = await apiClient.get('/orders');
    const data = Array.isArray(res.data?.data) ? res.data.data : [];
    return data as Order[];
  } catch (error) {
    console.warn('Failed to fetch user orders:', error);
    return [];
  }
};

export const createReview = async (payload: ReviewPayload): Promise<OrderReview> => {
  const res = await apiClient.post('orders/reviews', payload);
  return res.data.data as OrderReview;
};

export const getProductReviews = async (productId: string): Promise<OrderReview[]> => {
  try {
    const res = await apiClient.get(`/orders/products/${productId}/reviews`);
    return (res.data?.data || []) as OrderReview[];
  } catch (error) {
    console.warn(`Failed to fetch reviews for product ${productId}:`, error);
    return [];
  }
};
