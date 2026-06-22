import { db } from "../config/firebase";
import { Notification } from "../types";
import { v4 as uuidv4 } from 'uuid';

export const createNotificationRepo = async (data: {
  title: string;
  body?: string;
  type?: string;
  product_id?: string | null;
  sent_by?: string;
  user_id?: string | null;
}): Promise<Notification> => {
  const newId = uuidv4();
  const notification: Notification = {
    id: newId,
    title: data.title,
    body: data.body || null,
    type: data.type || "new_arrival",
    product_id: data.product_id || null,
    sent_by: data.sent_by || null,
    user_id: data.user_id || null,
    is_read: false,
    created_at: new Date().toISOString()
  };

  await db.collection("notifications").doc(newId).set(notification);
  return notification;
};

export const broadcastNotificationRepo = async (data: {
  title: string;
  body?: string;
  type?: string;
  product_id?: string | null;
  sent_by: string;
}): Promise<number> => {
  const usersSnapshot = await db.collection("profiles")
    .where("is_active", "==", true)
    .where("role", "==", "user")
    .get();

  if (usersSnapshot.empty) return 0;

  const batch = db.batch();
  let count = 0;

  usersSnapshot.docs.forEach(doc => {
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
      created_at: new Date().toISOString()
    };
    const ref = db.collection("notifications").doc(newId);
    batch.set(ref, notification);
    count++;
  });

  await batch.commit();
  return count;
};

export const getUserNotificationsRepo = async (
  userId: string,
  page: number = 1,
  limit: number = 20,
): Promise<{ notifications: Notification[]; total: number }> => {
  const query = db.collection("notifications").where("user_id", "==", userId);
  const countSnapshot = await query.count().get();
  const total = countSnapshot.data().count;

  const offset = (page - 1) * limit;

  const snapshot = await query.orderBy("created_at", "desc").get();
  
  // Apply pagination in memory since we need offset
  const allDocs = snapshot.docs.map(doc => doc.data() as Notification);
  const paginated = allDocs.slice(offset, offset + limit);

  const notificationsWithProducts = await Promise.all(paginated.map(async (n) => {
    let product_name = undefined;
    if (n.product_id) {
      const pDoc = await db.collection("products").doc(n.product_id).get();
      if (pDoc.exists) {
        product_name = pDoc.data()?.product_name;
      }
    }
    return { ...n, product_name };
  }));

  return { notifications: notificationsWithProducts, total };
};

export const markNotificationReadRepo = async (
  id: string,
  userId: string,
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

export const getUnreadCountRepo = async (userId: string): Promise<number> => {
  const countSnapshot = await db.collection("notifications")
    .where("user_id", "==", userId)
    .where("is_read", "==", false)
    .count()
    .get();
    
  return countSnapshot.data().count;
};
