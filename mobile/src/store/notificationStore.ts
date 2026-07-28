import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getNewArrivals, Product } from '../api/products';

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

      const { products } = await getNewArrivals(7, 1, 20);
      
      const dynamicNotifs: AppNotification[] = products.map((p: Product) => ({
        id: p.id,
        title: 'New Product Added! ✨',
        desc: `${p.product_name} has just been added to our collection for ₹${p.price}. Tap to view!`,
        time: getRelativeTime(p.created_at),
        icon: 'sparkles-outline',
        isRead: parsedRead.includes(p.id),
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

      const allNotifs = [...dynamicNotifs, ...staticNotifs];
      const filteredNotifs = allNotifs.filter(n => !parsedDeleted.includes(n.id));

      const unreadCount = filteredNotifs.filter(n => !n.isRead).length;

      set({ notifications: filteredNotifs, initialized: true, unreadCount });
    } catch (error) {
      console.error('Failed to fetch notifications for store', error);
    }
  },

  markAsRead: async (id: string) => {
    const { notifications } = get();
    const notif = notifications.find(n => n.id === id);
    if (!notif || notif.isRead) return;

    // Optimistic UI update
    const updatedNotifs = notifications.map(n => 
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
    } catch (error) {
      console.error('Failed to save read notification', error);
    }
  },

  deleteNotifications: async (ids: string[]) => {
    const { notifications } = get();
    const updatedNotifs = notifications.filter(n => !ids.includes(n.id));
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
