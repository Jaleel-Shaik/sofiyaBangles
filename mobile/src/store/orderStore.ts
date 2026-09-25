import { create } from 'zustand';
import { api } from '@/src/api';
import type { Order, OrderItem } from '@/src/api/orders';

export interface PurchasedProductInfo {
  orderId: string;
  orderNumber?: string;
  itemId?: string;
  status: string; // 'completed' | 'pending' | 'cancelled'
  isReviewed: boolean;
  purchaseDate?: string;
  price?: number;
  size?: string;
}

interface OrderStore {
  orders: Order[];
  loading: boolean;
  initialized: boolean;
  fetchOrders: (silent?: boolean) => Promise<void>;
  addOptimisticOrder: (order: Order) => void;
  markItemReviewedInStore: (itemId: string) => void;
  // E-commerce purchase query helpers
  hasPurchasedProduct: (productId: string) => boolean;
  getLatestPurchaseForProduct: (productId: string) => PurchasedProductInfo | null;
  getAllPurchasesForProduct: (productId: string) => PurchasedProductInfo[];
  getPurchaseCountForProduct: (productId: string) => number;
}

export const useOrderStore = create<OrderStore>((set, get) => ({
  orders: [],
  loading: false,
  initialized: false,

  fetchOrders: async (silent = false) => {
    if (!silent) set({ loading: true });
    try {
      const data = await api.orders.getUserOrders();
      const safeOrders = Array.isArray(data) ? data : [];
      set({ orders: safeOrders, initialized: true, loading: false });
    } catch (error) {
      if (!silent) {
        console.warn('Failed to fetch orders in orderStore:', error);
      }
      set({ loading: false, initialized: true });
    }
  },

  addOptimisticOrder: (newOrder: Order) => {
    const currentOrders = get().orders;
    const exists = currentOrders.some((o) => o.id === newOrder.id);
    if (!exists) {
      set({ orders: [newOrder, ...currentOrders] });
    }
  },

  markItemReviewedInStore: (itemId: string) => {
    const currentOrders = get().orders;
    const updated = currentOrders.map((order) => {
      const hasItem = (order.items || []).some((item) => item.id === itemId);
      if (!hasItem) return order;
      return {
        ...order,
        items: (order.items || []).map((item) =>
          item.id === itemId ? { ...item, is_reviewed: true } : item
        ),
      };
    });
    set({ orders: updated });
  },

  hasPurchasedProduct: (productId: string) => {
    if (!productId) return false;
    const cleanId = String(productId).trim();
    return get().orders.some(
      (order) =>
        order.status !== 'cancelled' &&
        (order.items || []).some((item) => String(item.product_id).trim() === cleanId)
    );
  },

  getLatestPurchaseForProduct: (productId: string) => {
    if (!productId) return null;
    const cleanId = String(productId).trim();
    const orders = get().orders;

    for (const order of orders) {
      if (order.status === 'cancelled') continue;
      const matchingItem = (order.items || []).find(
        (item) => String(item.product_id).trim() === cleanId
      );
      if (matchingItem) {
        return {
          orderId: order.id,
          orderNumber: order.order_number,
          itemId: matchingItem.id,
          status: order.status,
          isReviewed: Boolean(matchingItem.is_reviewed),
          purchaseDate: order.created_at,
          price: matchingItem.price,
          size: matchingItem.size,
        };
      }
    }
    return null;
  },

  getAllPurchasesForProduct: (productId: string) => {
    if (!productId) return [];
    const cleanId = String(productId).trim();
    const result: PurchasedProductInfo[] = [];

    for (const order of get().orders) {
      if (order.status === 'cancelled') continue;
      for (const item of order.items || []) {
        if (String(item.product_id).trim() === cleanId) {
          result.push({
            orderId: order.id,
            orderNumber: order.order_number,
            itemId: item.id,
            status: order.status,
            isReviewed: Boolean(item.is_reviewed),
            purchaseDate: order.created_at,
            price: item.price,
            size: item.size,
          });
        }
      }
    }
    return result;
  },

  getPurchaseCountForProduct: (productId: string) => {
    return get().getAllPurchasesForProduct(productId).length;
  },
}));
