import { create } from 'zustand';
import { api } from '@/src/api';
import type { AdminNotificationItem } from '@/src/api/admin';

export type AdminNotificationCategory = 'all' | 'unread' | 'orders' | 'stock' | 'reviews' | 'arrivals';

export function getAdminNotificationCategory(n: AdminNotificationItem): 'orders' | 'stock' | 'reviews' | 'arrivals' | 'system' {
  const type = (n.type || '').toUpperCase();
  const title = (n.title || '').toLowerCase();
  const body = (n.body || n.message || '').toLowerCase();

  // Orders & Sales
  if (
    type === 'NEW_SALE' ||
    type === 'ORDER' ||
    type === 'ORDER_STATUS' ||
    type === 'ORDER_STATUS_UPDATE' ||
    type === 'REFUND' ||
    type === 'PAYMENT' ||
    title.includes('sale') ||
    title.includes('order') ||
    title.includes('refund') ||
    title.includes('purchased') ||
    body.includes('order ord-') ||
    /ORD-[\w\d-]+/i.test(title) ||
    /ORD-[\w\d-]+/i.test(body)
  ) {
    return 'orders';
  }

  // New Arrivals
  if (
    type === 'NEW_ARRIVAL' ||
    type === 'PRODUCT_ARRIVAL' ||
    title.includes('arrival') ||
    title.includes('new product') ||
    body.includes('arrival')
  ) {
    return 'arrivals';
  }

  // Stock & Inventory
  if (
    type === 'LOW_STOCK' ||
    type === 'OUT_OF_STOCK' ||
    type === 'RESTOCK' ||
    type === 'STOCK_UPDATE' ||
    type === 'PRODUCT_RESTOCKED' ||
    title.includes('stock') ||
    title.includes('inventory') ||
    title.includes('quantity')
  ) {
    return 'stock';
  }

  // Reviews & Feedback
  if (
    type === 'REVIEW' ||
    type === 'RATING' ||
    type === 'PRODUCT_REVIEW' ||
    type === 'FEEDBACK' ||
    title.includes('review') ||
    title.includes('rated') ||
    title.includes('feedback')
  ) {
    return 'reviews';
  }

  return 'system';
}

export function formatAdminRelativeTime(dateString?: string): string {
  if (!dateString) return 'Recently';
  const diffSec = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
  if (diffSec < 45) return 'Just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  if (diffSec < 172800) return 'Yesterday';
  return new Date(dateString).toLocaleDateString([], { month: 'short', day: 'numeric' });
}

interface AdminNotificationStore {
  notifications: AdminNotificationItem[];
  unreadCount: number;
  loading: boolean;
  initialized: boolean;
  fetchNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  clearAll: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
}

export const useAdminNotificationStore = create<AdminNotificationStore>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  loading: false,
  initialized: false,

  fetchNotifications: async () => {
    try {
      set({ loading: true });
      const items = await api.admin.getAdminNotifications();
      const list = Array.isArray(items) ? items : [];
      const unreadCount = list.filter((n) => !n.is_read).length;
      set({ notifications: list, unreadCount, initialized: true, loading: false });
    } catch (err) {
      console.warn('Error fetching admin notifications:', err);
      set({ loading: false, initialized: true });
    }
  },

  markAsRead: async (id: string) => {
    const prev = get().notifications;
    set({
      notifications: prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
      unreadCount: Math.max(0, get().unreadCount - 1),
    });
    await api.admin.markAdminNotificationRead(id);
  },

  markAllAsRead: async () => {
    const prev = get().notifications;
    set({
      notifications: prev.map((n) => ({ ...n, is_read: true })),
      unreadCount: 0,
    });
    await api.admin.markAllAdminNotificationsRead();
  },

  clearAll: async () => {
    set({ notifications: [], unreadCount: 0 });
    await api.admin.clearAllAdminNotifications();
  },

  deleteNotification: async (id: string) => {
    const prev = get().notifications;
    const target = prev.find((n) => n.id === id);
    set({
      notifications: prev.filter((n) => n.id !== id),
      unreadCount: target && !target.is_read ? Math.max(0, get().unreadCount - 1) : get().unreadCount,
    });
    await api.admin.deleteAdminNotification(id);
  },
}));
