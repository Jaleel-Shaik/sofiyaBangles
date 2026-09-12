import { db } from "../shared/config/firebase";
import { Notification } from "../shared/types";
import { v4 as uuidv4 } from "uuid";

/**
 * Pure Database Operation: Insert a notification document.
 */
export const insertNotificationDb = async (
  notification: Notification
): Promise<Notification> => {
  await db.collection("notifications").doc(notification.id).set(notification);
  return notification;
};

/**
 * Pure Database Operation: Batch insert notifications to active users.
 */
export const batchInsertBroadcastNotificationsDb = async (
  inputOrNotifications: {
    title: string;
    body?: string;
    type?: string;
    product_id?: string | null;
    sent_by: string;
  } | Notification[]
): Promise<number> => {
  if (Array.isArray(inputOrNotifications)) {
    if (inputOrNotifications.length === 0) return 0;
    const batch = db.batch();
    inputOrNotifications.forEach((n) => {
      batch.set(db.collection("notifications").doc(n.id), n);
    });
    await batch.commit();
    return inputOrNotifications.length;
  }

  const data = inputOrNotifications;
  const usersSnapshot = await db.collection("users").where("is_active", "==", true).get();
  if (usersSnapshot.empty) return 0;

  const batch = db.batch();
  let count = 0;
  const now = new Date().toISOString();

  usersSnapshot.docs.forEach((doc) => {
    const newId = uuidv4();
    const notification: Notification = {
      id: newId,
      title: data.title,
      body: data.body || null,
      type: data.type || "announcement",
      product_id: data.product_id || null,
      sent_by: data.sent_by,
      user_id: doc.id,
      is_read: false,
      created_at: now,
    };
    batch.set(db.collection("notifications").doc(newId), notification);
    count++;
  });

  await batch.commit();
  return count;
};

/**
 * Pure Database Operation: Get user notifications with pagination.
 */
export const queryUserNotificationsDb = async (
  userId: string,
  page?: number,
  limit?: number
): Promise<{ notifications: Notification[]; total: number }> => {
  const p = Math.max(1, page || 1);
  const l = Math.max(1, Math.min(100, limit || 20));

  const snapshot = await db
    .collection("notifications")
    .where("user_id", "==", userId)
    .get();

  let notifications = snapshot.docs.map((doc) => doc.data() as Notification);
  notifications.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const total = notifications.length;
  const offset = (p - 1) * l;
  const paginated = notifications.slice(offset, offset + l);

  return { notifications: paginated, total };
};

/**
 * Pure Database Operation: Update notification read status.
 */
export const updateNotificationReadDb = async (
  id: string,
  userId: string
): Promise<Notification | null> => {
  const docRef = db.collection("notifications").doc(id);
  const doc = await docRef.get();
  if (!doc.exists) return null;

  const data = doc.data() as Notification;
  if (data.user_id !== userId) return null;

  await docRef.update({ is_read: true });
  const updatedDoc = await docRef.get();
  return updatedDoc.data() as Notification;
};

/**
 * Pure Database Operation: Count unread notifications for a user.
 */
export const countUnreadNotificationsDb = async (userId: string): Promise<number> => {
  const countSnapshot = await db
    .collection("notifications")
    .where("user_id", "==", userId)
    .where("is_read", "==", false)
    .count()
    .get();

  return countSnapshot.data().count;
};
