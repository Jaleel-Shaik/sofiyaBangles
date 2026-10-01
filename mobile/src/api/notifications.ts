import { API_ENDPOINTS } from './endpoints';
import { apiClient } from './client';

export interface BackendNotification {
  id: string;
  title: string;
  body: string | null;
  type: string;
  product_id: string | null;
  sent_by: string | null;
  user_id: string | null;
  is_read: boolean;
  created_at: string;
  image_url?: string | null;
  order_id?: string | null;
  order_number?: string | null;
  link_url?: string | null;
}

/**
 * Fetch notifications for current user or broadcast announcements.
 */
export const getNotifications = async (
  page = 1,
  limit = 20
): Promise<{ notifications: BackendNotification[]; total: number }> => {
  try {
    const res = await apiClient.get(`${API_ENDPOINTS.NOTIFICATIONS.BASE}?page=${page}&limit=${limit}`);
    const rawData = res.data?.data ?? (Array.isArray(res.data) ? res.data : []);
    const notifications: BackendNotification[] = Array.isArray(rawData) ? rawData : [];
    const total = typeof res.data?.pagination?.total === 'number'
      ? res.data.pagination.total
      : (typeof res.data?.total === 'number' ? res.data.total : notifications.length);

    return { notifications, total };
  } catch (error) {
    console.warn('Error fetching notifications from backend:', error);
    return { notifications: [], total: 0 };
  }
};

/**
 * Fetch unread notification count.
 */
export const getUnreadCount = async (): Promise<number> => {
  try {
    const res = await apiClient.get(API_ENDPOINTS.NOTIFICATIONS.UNREAD_COUNT);
    return typeof res.data?.data?.count === 'number' ? res.data.data.count : 0;
  } catch (error) {
    console.warn('Error fetching unread count from backend:', error);
    return 0;
  }
};

/**
 * Mark a notification as read.
 */
export const markNotificationRead = async (id: string): Promise<void> => {
  try {
    await apiClient.patch(API_ENDPOINTS.NOTIFICATIONS.MARK_READ(id));
  } catch (error) {
    console.warn(`Error marking notification ${id} as read:`, error);
  }
};

/**
 * Mark all notifications as read for current user.
 */
export const markAllNotificationsRead = async (): Promise<void> => {
  try {
    await apiClient.patch(API_ENDPOINTS.NOTIFICATIONS.MARK_ALL_READ);
  } catch (error) {
    console.warn('Error marking all notifications as read:', error);
  }
};

/**
 * Delete / dismiss a single notification.
 */
export const deleteNotification = async (id: string): Promise<void> => {
  try {
    await apiClient.delete(API_ENDPOINTS.NOTIFICATIONS.BY_ID(id));
  } catch (error) {
    console.warn(`Error deleting notification ${id}:`, error);
  }
};

/**
 * Clear all notifications for current user.
 */
export const clearAllNotifications = async (): Promise<void> => {
  try {
    await apiClient.delete(API_ENDPOINTS.NOTIFICATIONS.CLEAR_ALL);
  } catch (error) {
    console.warn('Error clearing all notifications:', error);
  }
};

