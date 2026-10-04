import { api } from "@/src/api";
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface AppNotification {
  id: string;
  title: string;
  desc: string;
  time: string;
  rawTime: string;
  icon: string;
  isRead: boolean;
  type: string;
  productId?: string;
  imageUrl?: string;
  orderId?: string;
  orderNumber?: string;
  linkUrl?: string;
}

interface NotificationStore {
  notifications: AppNotification[];
  initialized: boolean;
  unreadCount: number;
  activeInAppBanner: AppNotification | null;
  fetchNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotifications: (ids: string[]) => Promise<void>;
  clearAllNotifications: () => Promise<void>;
  showInAppBanner: (notif: AppNotification) => void;
  dismissInAppBanner: () => void;
}

const getRelativeTime = (dateString?: string) => {
  if (!dateString) return 'Recently';
  const diff = Date.now() - new Date(dateString).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor(diff / (1000 * 60));
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'Just now';
};

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  notifications: [],
  initialized: false,
  unreadCount: 0,
  activeInAppBanner: null,

  fetchNotifications: async () => {
    try {
      const storedDeleted = await AsyncStorage.getItem('deleted_notifications');
      const parsedDeleted: string[] = storedDeleted ? JSON.parse(storedDeleted) : [];

      const storedRead = await AsyncStorage.getItem('read_notifications');
      const parsedRead: string[] = storedRead ? JSON.parse(storedRead) : [];

      const notifRes = await api.notifications.getNotifications(1, 50);
      const incoming = Array.isArray(notifRes?.notifications) ? notifRes.notifications : [];

      // Deduplicate strictly by id and logical signature
      const seenIds = new Set<string>();
      const seenSignatures = new Set<string>();
      const parsedNotifs: AppNotification[] = [];

      for (const n of incoming) {
        if (!n || !n.id) continue;
        if (parsedDeleted.includes(n.id)) continue;
        if (seenIds.has(n.id)) continue;

        const prodId =
          n.product_id ||
          (n.link_url ? n.link_url.match(/\/products\/([a-zA-Z0-9_-]+)/)?.[1] : undefined);
        const orderRef =
          n.order_id ||
          n.order_number ||
          (n.title + ' ' + (n.body || '')).match(/ORD-[\w\d-]+/i)?.[0];

        let sig = '';
        if (prodId) {
          sig = `product:${prodId}`;
        } else if (orderRef) {
          sig = `order:${orderRef.toUpperCase()}`;
        } else {
          const normTitle = (n.title || '').trim().toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ');
          const normBody = (n.body || '').trim().toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ');
          sig = normTitle ? `msg:${normTitle}:${normBody}` : `id:${n.id}`;
        }

        if (seenSignatures.has(sig)) continue;

        seenIds.add(n.id);
        seenSignatures.add(sig);

        let icon = 'notificationsOutline';
        const typeLower = (n.type || '').toLowerCase();
        const titleLower = (n.title || '').toLowerCase();
        if (typeLower.includes('arrival') || titleLower.includes('arrival')) {
          icon = 'sparklesOutline';
        } else if (
          typeLower.includes('stock') ||
          typeLower.includes('back_in_stock') ||
          titleLower.includes('stock') ||
          titleLower.includes('restock')
        ) {
          icon = 'cubeOutline';
        } else if (
          typeLower.includes('order') ||
          typeLower.includes('sale') ||
          titleLower.includes('order') ||
          n.order_id ||
          n.order_number
        ) {
          icon = 'bagOutline';
        }

        const isLocallyRead = parsedRead.includes(n.id);
        parsedNotifs.push({
          id: n.id,
          title: n.title,
          desc: n.body || '',
          time: getRelativeTime(n.created_at),
          rawTime: n.created_at,
          icon,
          isRead: Boolean(n.is_read || isLocallyRead),
          type: n.type || 'announcement',
          productId: prodId || undefined,
          imageUrl: n.image_url || undefined,
          orderId: n.order_id || undefined,
          orderNumber: n.order_number || undefined,
          linkUrl: n.link_url || undefined,
        });
      }

      const unreadCount = parsedNotifs.filter(n => !n.isRead).length;

      // Check if there is a brand new unread notification to feature in in-app banner
      const prevNotifs = get().notifications;
      const latest = parsedNotifs[0];
      let newBanner: AppNotification | null = get().activeInAppBanner;

      if (latest && !latest.isRead) {
        const timeDiff = Date.now() - new Date(latest.rawTime).getTime();
        const isBrandNew = prevNotifs.length > 0 && !prevNotifs.some(p => p.id === latest.id);
        const isFreshUnread = prevNotifs.length === 0 && timeDiff < 5 * 60 * 1000;
        if ((isBrandNew && timeDiff < 10 * 60 * 1000) || isFreshUnread) {
          newBanner = latest;
        }
      }

      set({ notifications: parsedNotifs, initialized: true, unreadCount, activeInAppBanner: newBanner });
    } catch (error) {
      console.error('Failed to fetch notifications for store', error);
      set({ notifications: [], initialized: true, unreadCount: 0 });
    }
  },

  showInAppBanner: (notif: AppNotification) => {
    set({ activeInAppBanner: notif });
  },

  dismissInAppBanner: () => {
    set({ activeInAppBanner: null });
  },

  markAsRead: async (id: string) => {
    const { notifications, activeInAppBanner } = get();
    const safeNotifs = Array.isArray(notifications) ? notifications : [];
    const notif = safeNotifs.find(n => n && n.id === id);
    if (!notif || notif.isRead) return;

    // Optimistic UI update
    const updatedNotifs = safeNotifs.map(n =>
      n.id === id ? { ...n, isRead: true } : n
    );
    const unreadCount = updatedNotifs.filter(n => !n.isRead).length;
    const updatedBanner = activeInAppBanner?.id === id ? null : activeInAppBanner;

    set({ notifications: updatedNotifs, unreadCount, activeInAppBanner: updatedBanner });

    try {
      const storedRead = await AsyncStorage.getItem('read_notifications');
      const parsedRead: string[] = storedRead ? JSON.parse(storedRead) : [];
      if (!parsedRead.includes(id)) {
        parsedRead.push(id);
        await AsyncStorage.setItem('read_notifications', JSON.stringify(parsedRead));
      }

      // Sync read state with backend
      api.notifications.markNotificationRead(id).catch(() => {});
    } catch (error) {
      console.error('Failed to save read notification', error);
    }
  },

  markAllAsRead: async () => {
    const { notifications } = get();
    const safeNotifs = Array.isArray(notifications) ? notifications : [];
    const updatedNotifs = safeNotifs.map(n => ({ ...n, isRead: true }));
    set({ notifications: updatedNotifs, unreadCount: 0, activeInAppBanner: null });

    try {
      const allIds = safeNotifs.map(n => n.id);
      await AsyncStorage.setItem('read_notifications', JSON.stringify(allIds));
      api.notifications.markAllNotificationsRead().catch(() => {});
    } catch (error) {
      console.error('Failed to mark all as read', error);
    }
  },

  deleteNotifications: async (ids: string[]) => {
    const { notifications, activeInAppBanner } = get();
    const safeNotifs = Array.isArray(notifications) ? notifications : [];
    const updatedNotifs = safeNotifs.filter(n => n && !ids.includes(n.id));
    const unreadCount = updatedNotifs.filter(n => !n.isRead).length;
    const updatedBanner = activeInAppBanner && ids.includes(activeInAppBanner.id) ? null : activeInAppBanner;

    set({ notifications: updatedNotifs, unreadCount, activeInAppBanner: updatedBanner });

    try {
      const storedDeleted = await AsyncStorage.getItem('deleted_notifications');
      const parsedDeleted: string[] = storedDeleted ? JSON.parse(storedDeleted) : [];
      const newDeleted = Array.from(new Set([...parsedDeleted, ...ids]));
      await AsyncStorage.setItem('deleted_notifications', JSON.stringify(newDeleted));

      // Call backend delete for each
      ids.forEach(id => {
        api.notifications.deleteNotification(id).catch(() => {});
      });
    } catch (error) {
      console.error('Failed to save deleted notifications', error);
    }
  },

  clearAllNotifications: async () => {
    const { notifications } = get();
    const safeNotifs = Array.isArray(notifications) ? notifications : [];
    const ids = safeNotifs.map(n => n.id);
    set({ notifications: [], unreadCount: 0, activeInAppBanner: null });

    try {
      const storedDeleted = await AsyncStorage.getItem('deleted_notifications');
      const parsedDeleted: string[] = storedDeleted ? JSON.parse(storedDeleted) : [];
      const newDeleted = Array.from(new Set([...parsedDeleted, ...ids]));
      await AsyncStorage.setItem('deleted_notifications', JSON.stringify(newDeleted));

      api.notifications.clearAllNotifications().catch(() => {});
    } catch (error) {
      console.error('Failed to clear all notifications', error);
    }
  },
}));


