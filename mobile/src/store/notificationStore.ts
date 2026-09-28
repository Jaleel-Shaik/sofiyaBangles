import type { Product } from '@/src/api/products';
import { api } from "@/src/api";
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface AppNotification {
  id: string;
  title: string;
  desc: string;
  time: string;
  icon: string;
  isRead: boolean;
  productId?: string;
}

interface NotificationStore {
  notifications: AppNotification[];
  initialized: boolean;
  unreadCount: number;
  fetchNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  deleteNotifications: (ids: string[]) => Promise<void>;
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

  fetchNotifications: async () => {
    try {
      const storedDeleted = await AsyncStorage.getItem('deleted_notifications');
      const parsedDeleted: string[] = storedDeleted ? JSON.parse(storedDeleted) : [];

      const storedRead = await AsyncStorage.getItem('read_notifications');
      const parsedRead: string[] = storedRead ? JSON.parse(storedRead) : [];

      let backendNotifs: AppNotification[] = [];

      try {
        const notifRes = await api.notifications.getNotifications(1, 50);
        const incoming = Array.isArray(notifRes?.notifications) ? notifRes.notifications : [];
        backendNotifs = incoming.map((n) => {
          let icon = 'notifications-outline';
          if (n.type === 'stock_update' || n.type === 'back_in_stock') {
            icon = 'cube-outline';
          } else if (n.type === 'new_arrival') {
            icon = 'sparkles-outline';
          } else if (n.type && n.type.toLowerCase().includes('order')) {
            icon = 'bag-handle-outline';
          }

          const isLocallyRead = parsedRead.includes(n.id);
          return {
            id: n.id,
            title: n.title,
            desc: n.body || '',
            time: getRelativeTime(n.created_at),
            icon,
            isRead: n.is_read || isLocallyRead,
            productId: n.product_id || undefined,
          };
        });
      } catch (err) {
        console.warn('Could not fetch backend notifications:', err);
      }

      // New arrivals as supplemental discovery notifications
      const newArrivalsRes = await api.products.getNewArrivals(7, 1, 10).catch(() => ({ products: [] }));
      const incomingProducts = Array.isArray(newArrivalsRes?.products) ? newArrivalsRes.products : [];
      
      const productNotifs: AppNotification[] = incomingProducts
        .filter((p: Product) => !backendNotifs.some((bn) => bn.productId === p.id))
        .map((p: Product) => ({
          id: `arrival-${p.id}`,
          title: 'New Product Added! ✨',
          desc: `${p.product_name || 'Item'} has just been added to our collection for ₹${p.price || 0}. Tap to view!`,
          time: getRelativeTime(p.created_at),
          icon: 'sparkles-outline',
          isRead: parsedRead.includes(`arrival-${p.id}`),
          productId: p.id
        }));

      const staticNotifs: AppNotification[] = [
        { 
          id: 'static-1', 
          title: 'Welcome to Sofiya Bangles', 
          desc: 'Thank you for joining! Explore our premium collections of bangles.',
          time: '1w ago', 
          icon: 'heart-outline',
          isRead: parsedRead.includes('static-1') 
        }
      ];

      const allNotifs = [...backendNotifs, ...productNotifs, ...staticNotifs];
      const filteredNotifs = allNotifs.filter(n => n && !parsedDeleted.includes(n.id));

      const unreadCount = filteredNotifs.filter(n => !n.isRead).length;

      set({ notifications: filteredNotifs, initialized: true, unreadCount });
    } catch (error) {
      console.error('Failed to fetch notifications for store', error);
      set({ notifications: [], initialized: true, unreadCount: 0 });
    }
  },

  markAsRead: async (id: string) => {
    const { notifications } = get();
    const safeNotifs = Array.isArray(notifications) ? notifications : [];
    const notif = safeNotifs.find(n => n && n.id === id);
    if (!notif || notif.isRead) return;

    // Optimistic UI update
    const updatedNotifs = safeNotifs.map(n => 
      n.id === id ? { ...n, isRead: true } : n
    );
    const unreadCount = updatedNotifs.filter(n => !n.isRead).length;
    set({ notifications: updatedNotifs, unreadCount });

    try {
      const storedRead = await AsyncStorage.getItem('read_notifications');
      const parsedRead: string[] = storedRead ? JSON.parse(storedRead) : [];
      if (!parsedRead.includes(id)) {
        parsedRead.push(id);
        await AsyncStorage.setItem('read_notifications', JSON.stringify(parsedRead));
      }

      // Sync read state with backend if it's a backend notification
      if (!id.startsWith('static-') && !id.startsWith('arrival-')) {
        api.notifications.markNotificationRead(id).catch(() => {});
      }
    } catch (error) {
      console.error('Failed to save read notification', error);
    }
  },

  deleteNotifications: async (ids: string[]) => {
    const { notifications } = get();
    const safeNotifs = Array.isArray(notifications) ? notifications : [];
    const updatedNotifs = safeNotifs.filter(n => n && !ids.includes(n.id));
    const unreadCount = updatedNotifs.filter(n => !n.isRead).length;
    set({ notifications: updatedNotifs, unreadCount });

    try {
      const storedDeleted = await AsyncStorage.getItem('deleted_notifications');
      const parsedDeleted: string[] = storedDeleted ? JSON.parse(storedDeleted) : [];
      const newDeleted = [...parsedDeleted, ...ids];
      await AsyncStorage.setItem('deleted_notifications', JSON.stringify(newDeleted));
    } catch (error) {
      console.error('Failed to save deleted notifications', error);
    }
  }
}));
