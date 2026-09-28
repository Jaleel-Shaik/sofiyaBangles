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
 * Inserts a master broadcast document (user_id: null) and individual records for all active users.
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
    // Chunk in batches of 400
    const chunkSize = 400;
    for (let i = 0; i < inputOrNotifications.length; i += chunkSize) {
      const chunk = inputOrNotifications.slice(i, i + chunkSize);
      const batch = db.batch();
      chunk.forEach((n) => {
        batch.set(db.collection("notifications").doc(n.id), n);
      });
      await batch.commit();
    }
    return inputOrNotifications.length;
  }

  const data = inputOrNotifications;
  const now = new Date().toISOString();

  // 1. Create a global broadcast notification record (user_id: null)
  const globalId = uuidv4();
  const globalNotification: Notification = {
    id: globalId,
    title: data.title,
    body: data.body || null,
    type: data.type || "announcement",
    product_id: data.product_id || null,
    sent_by: data.sent_by,
    user_id: null,
    is_read: false,
    created_at: now,
  };
  await db.collection("notifications").doc(globalId).set(globalNotification);

  // 2. Fetch all users from users collection
  const usersSnapshot = await db.collection("users").get();
  const activeUserDocs = usersSnapshot.docs.filter((doc) => {
    const userData = doc.data();
    return userData.is_active !== false;
  });

  if (activeUserDocs.length === 0) return 1;

  // 3. Batch insert per-user notification records in safe chunks (max 400 docs per batch)
  const chunkSize = 400;
  let count = 1; // including the global notification

  for (let i = 0; i < activeUserDocs.length; i += chunkSize) {
    const chunk = activeUserDocs.slice(i, i + chunkSize);
    const batch = db.batch();

    chunk.forEach((doc) => {
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
  }

  return count;
};

/**
 * Pure Database Operation: Get user notifications with pagination.
 * Supports returning both user-specific and global broadcast (user_id == null) notifications.
 */
export const queryUserNotificationsDb = async (
  userId?: string | null,
  page?: number,
  limit?: number
): Promise<{ notifications: Notification[]; total: number }> => {
  const p = Math.max(1, page || 1);
  const l = Math.max(1, Math.min(100, limit || 20));

  let notifications: Notification[] = [];

  if (userId) {
    const [userSnap, broadcastSnap] = await Promise.all([
      db.collection("notifications").where("user_id", "==", userId).get(),
      db.collection("notifications").where("user_id", "==", null).get(),
    ]);

    const map = new Map<string, Notification>();
    userSnap.docs.forEach((doc) => map.set(doc.id, doc.data() as Notification));
    broadcastSnap.docs.forEach((doc) => {
      if (!map.has(doc.id)) map.set(doc.id, doc.data() as Notification);
    });

    notifications = Array.from(map.values());
  } else {
    const broadcastSnap = await db.collection("notifications").where("user_id", "==", null).get();
    notifications = broadcastSnap.docs.map((doc) => doc.data() as Notification);
  }

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
  if (data.user_id && data.user_id !== userId) return null;

  await docRef.update({ is_read: true });
  const updatedDoc = await docRef.get();
  return updatedDoc.data() as Notification;
};

/**
 * Pure Database Operation: Count unread notifications for a user.
 */
export const countUnreadNotificationsDb = async (userId?: string | null): Promise<number> => {
  if (!userId) {
    const broadcastCountSnap = await db
      .collection("notifications")
      .where("user_id", "==", null)
      .where("is_read", "==", false)
      .count()
      .get();
    return broadcastCountSnap.data().count;
  }

  const [userSnap, broadcastSnap] = await Promise.all([
    db.collection("notifications").where("user_id", "==", userId).where("is_read", "==", false).get(),
    db.collection("notifications").where("user_id", "==", null).where("is_read", "==", false).get(),
  ]);

  const unreadSet = new Set<string>();
  userSnap.docs.forEach((d) => unreadSet.add(d.id));
  broadcastSnap.docs.forEach((d) => unreadSet.add(d.id));

  return unreadSet.size;
};
