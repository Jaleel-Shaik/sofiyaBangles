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
  order_number?: string;
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
  orderId?: string | null;
  orderItemId?: string | null;
  rating: number; // 1-5 stars (Product Quality)
  qualityRating?: number;
  comment?: string | null;
  suggestion?: string | null; // Any suggestions
  isDefective?: boolean; // Damage or defective flag
  damageDetails?: string | null; // Defect details
  customerName?: string | null;
}

export interface OrderReview {
  id: string;
  product_id?: string;
  rating: number;
  comment: string | null;
  suggestion?: string | null;
  is_defective?: boolean;
  damage_details: string | null;
  user_name?: string;
  user_email?: string;
  user_phone?: string;
  order_id?: string | null;
  order_number?: string | null;
  product_name?: string;
  product_image?: string | null;
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

export const getAdminReviews = async (): Promise<OrderReview[]> => {
  try {
    const res = await apiClient.get('/orders/admin/reviews');
    const data = Array.isArray(res.data?.data) ? res.data.data : [];
    return data as OrderReview[];
  } catch (error) {
    console.warn('Failed to fetch admin reviews:', error);
    return [];
  }
};

export interface WhatsAppPurchasePayload {
  productId?: string;
  product_id?: string;
  variantId?: string | null;
  variant_id?: string | null;
  quantity?: number;
  size?: string | null;
  customMeasurements?: Record<string, string> | null;
  notes?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  phone?: string | null;
}

export interface WhatsAppPurchaseResponse {
  orderId: string;
  orderNumber: string;
  totalAmount: number;
  status: string;
  deliveryMode: "cloud_api" | "client_dispatch";
  whatsappStatus: "sent" | "ready";
  whatsappUrl?: string;
}

/**
 * Initiates an authenticated, server-verified product purchase and WhatsApp notification.
 *
 * Security Guarantee:
 * - User name and mobile number are retrieved securely on the server from the authenticated session.
 * - Product price and stock are validated directly on the backend database.
 * - WhatsApp credentials remain strictly isolated on the backend.
 * - Sensitive customer PII is never passed in query parameters or exposed in client logs.
 */
export const initiateWhatsAppPurchase = async (
  payload: WhatsAppPurchasePayload
): Promise<WhatsAppPurchaseResponse> => {
  const res = await apiClient.post('/orders/whatsapp-purchase', payload);
  return res.data.data as WhatsAppPurchaseResponse;
};

