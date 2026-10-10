import { db } from "../shared/config/firebase";
import { Notification } from "../shared/types";
import { randomUUID as uuidv4 } from "crypto";
import { FieldValue } from "firebase-admin/firestore";

/**
 * Pure Database Operation: Insert a single notification document.
 */
export const insertNotificationDb = async (
  notification: Notification
): Promise<Notification> => {
  await db.collection("notifications").doc(notification.id).set(notification);
  return notification;
};

/**
 * Pure Database Operation: Batch insert notifications.
 * When a broadcast specification is provided, inserts a single global broadcast record (user_id: null).
 * Does not create duplicate per-user records, preventing dual-notification bugs.
 */
export const batchInsertBroadcastNotificationsDb = async (
  inputOrNotifications: {
    title: string;
    body?: string;
    type?: string;
    product_id?: string | null;
    sent_by: string;
    image_url?: string | null;
    order_id?: string | null;
    order_number?: string | null;
    link_url?: string | null;
  } | Notification[]
): Promise<number> => {
  if (Array.isArray(inputOrNotifications)) {
    if (inputOrNotifications.length === 0) return 0;
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

  // If image_url was not passed but product_id was, attempt to fetch product image
  let resolvedImageUrl = data.image_url || null;
  if (!resolvedImageUrl && data.product_id) {
    try {
      const prodDoc = await db.collection("products").doc(data.product_id).get();
      if (prodDoc.exists) {
        resolvedImageUrl = prodDoc.data()?.image_url || null;
      }
    } catch {}
  }

  // 1. Debounce / Deduplicate: Clean up any previous notification doc for this product so a fresh notification event is published
  if (data.product_id) {
    const existingSnap = await db
      .collection("notifications")
      .where("product_id", "==", data.product_id)
      .get();

    if (!existingSnap.empty) {
      const batch = db.batch();
      existingSnap.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }
  }

  // 2. Create single global broadcast notification record (user_id: null) for guest users and future accounts
  const globalId = uuidv4();
  const globalNotification = {
    id: globalId,
    title: data.title,
    body: data.body || null,
    type: data.type || "announcement",
    product_id: data.product_id || null,
    image_url: resolvedImageUrl,
    order_id: data.order_id || null,
    order_number: data.order_number || null,
    link_url: data.link_url || null,
    sent_by: data.sent_by,
    user_id: null,
    is_read: false,
    read_by: [] as string[],
    dismissed_by: [] as string[],
    created_at: now,
  };

  // 3. Fetch all active users from users collection and generate user-specific notification records
  const usersSnapshot = await db.collection("users").get();
  const activeUserDocs = usersSnapshot.docs.filter((doc) => {
    const userData = doc.data();
    return userData?.is_active !== false;
  });

  const recordsToInsert: any[] = [globalNotification];
  activeUserDocs.forEach((uDoc) => {
    recordsToInsert.push({
      id: uuidv4(),
      title: data.title,
      body: data.body || null,
      type: data.type || "announcement",
      product_id: data.product_id || null,
      image_url: resolvedImageUrl,
      order_id: data.order_id || null,
      order_number: data.order_number || null,
      link_url: data.link_url || null,
      sent_by: data.sent_by,
      user_id: uDoc.id,
      is_read: false,
      created_at: now,
    });
  });

  // Batch insert all records in safe chunks (max 400 docs per commit)
  const chunkSize = 400;
  for (let i = 0; i < recordsToInsert.length; i += chunkSize) {
    const chunk = recordsToInsert.slice(i, i + chunkSize);
    const batch = db.batch();
    chunk.forEach((notif) => {
      batch.set(db.collection("notifications").doc(notif.id), notif);
    });
    await batch.commit();
  }

  return recordsToInsert.length;
};

/**
 * Deterministic notification deduplication key.
 * Guarantees that each product, order, or distinct message appears exactly once in the feed.
 */
export const getNotificationDedupeKey = (n: Notification): string => {
  const prodId =
    n.product_id ||
    (n.link_url ? n.link_url.match(/\/products\/([a-zA-Z0-9_-]+)/)?.[1] : null);
  if (prodId) {
    return `product:${prodId}`;
  }

  const orderRef =
    n.order_id ||
    n.order_number ||
    (n.title + " " + (n.body || "")).match(/ORD-[\w\d-]+/i)?.[0];
  if (orderRef) {
    return `order:${orderRef.toUpperCase()}`;
  }

  const cleanTitle = (n.title || "")
    .trim()
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ");
  const cleanBody = (n.body || "")
    .trim()
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ");

  return cleanTitle ? `msg:${cleanTitle}:${cleanBody}` : `id:${n.id}`;
};

/**
 * Pure Database Operation: Get user notifications with deduplication, filtering, and pagination.
 * Ensures each notification appears exactly once.
 */
export const queryUserNotificationsDb = async (
  userId?: string | null,
  page?: number,
  limit?: number
): Promise<{ notifications: Notification[]; total: number }> => {
  const p = Math.max(1, page || 1);
  const l = Math.max(1, Math.min(100, limit || 20));

  let rawNotifications: any[] = [];

  // Internal admin and review types that customers should never receive in their regular feed
  const ADMIN_INTERNAL_TYPES = new Set([
    "NEW_SALE",
    "REFUND",
    "AUDIT_ALERT",
    "REVIEW",
    "RATING",
    "PRODUCT_REVIEW",
    "SECURITY_ALERT",
    "SYSTEM_SECURITY",
    "ROLE_CHANGE",
    "2FA_RESET",
    "SYSTEM",
  ]);

  if (userId) {
    const [userSnap, broadcastSnap] = await Promise.all([
      db.collection("notifications").where("user_id", "==", userId).get(),
      db.collection("notifications").where("user_id", "==", null).get(),
    ]);

    const userNotifs = userSnap.docs
      .map((doc) => ({ ...doc.data(), id: doc.id }))
      .filter((n: any) => {
        if (ADMIN_INTERNAL_TYPES.has(n.type)) return false;
        if (Array.isArray(n.dismissed_by) && n.dismissed_by.includes(userId)) return false;
        return true;
      });

    const broadcastNotifs = broadcastSnap.docs
      .map((doc) => ({ ...doc.data(), id: doc.id }))
      .filter((n: any) => {
        // Exclude admin-internal types for regular user query
        if (ADMIN_INTERNAL_TYPES.has(n.type)) return false;
        if (n.user_id === "all_admins" || n.user_id === "all_superadmins") return false;
        // Exclude notifications this user dismissed/cleared
        if (Array.isArray(n.dismissed_by) && n.dismissed_by.includes(userId)) return false;
        return true;
      });

    rawNotifications = [...userNotifs, ...broadcastNotifs];
  } else {
    const broadcastSnap = await db.collection("notifications").where("user_id", "==", null).get();
    rawNotifications = broadcastSnap.docs
      .map((doc) => ({ ...doc.data(), id: doc.id }))
      .filter((n: any) => !ADMIN_INTERNAL_TYPES.has(n.type));
  }

  // Sort by created_at descending (newest first)
  rawNotifications.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  // Strict Deduplication:
  // Each logical notification (by product_id or title/body) appears only once.
  const dedupeMap = new Map<string, any>();

  for (const notif of rawNotifications) {
    const key = getNotificationDedupeKey(notif as Notification);
    const isReadForThisUser = notif.user_id
      ? Boolean(notif.is_read)
      : Boolean(notif.is_read || (userId && Array.isArray(notif.read_by) && notif.read_by.includes(userId)));

    const normalizedNotif: Notification = {
      id: notif.id,
      title: notif.title,
      body: notif.body || null,
      type: notif.type,
      product_id: notif.product_id || null,
      sent_by: notif.sent_by || null,
      user_id: notif.user_id || null,
      is_read: isReadForThisUser,
      created_at: notif.created_at,
      image_url: notif.image_url || null,
      order_id: notif.order_id || null,
      order_number: notif.order_number || null,
      link_url: notif.link_url || null,
    };

    if (!dedupeMap.has(key)) {
      dedupeMap.set(key, normalizedNotif);
    } else {
      // If an existing entry is unread and this duplicate is read (or vice versa),
      // keep the most accurate user-specific record
      const existing = dedupeMap.get(key)!;
      if (notif.user_id && !existing.user_id) {
        dedupeMap.set(key, normalizedNotif);
      }
    }
  }

  const uniqueNotifications = Array.from(dedupeMap.values());
  uniqueNotifications.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const total = uniqueNotifications.length;
  const offset = (p - 1) * l;
  const paginated = uniqueNotifications.slice(offset, offset + l);

  // Enrich paginated notifications with product image_url if missing
  const missingImageProductIds = Array.from(
    new Set(
      paginated
        .filter((n) => n.product_id && !n.image_url)
        .map((n) => n.product_id!)
    )
  );

  if (missingImageProductIds.length > 0) {
    try {
      const productDocs = await Promise.all(
        missingImageProductIds.map((pid) => db.collection("products").doc(pid).get())
      );
      const productImagesMap = new Map<string, string>();
      productDocs.forEach((doc) => {
        if (doc.exists) {
          const img = doc.data()?.image_url;
          if (img) productImagesMap.set(doc.id, img);
        }
      });

      paginated.forEach((n) => {
        if (n.product_id && !n.image_url && productImagesMap.has(n.product_id)) {
          n.image_url = productImagesMap.get(n.product_id);
        }
      });
    } catch (err) {
      // non-fatal image enrichment failure
    }
  }

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

  const data = doc.data() as any;
  if (data.user_id && data.user_id !== userId) return null;

  if (data.user_id === userId) {
    await docRef.update({ is_read: true });
    return { ...(data as Notification), is_read: true };
  } else {
    // Global broadcast notification: mark as read for this specific user
    await docRef.update({
      read_by: FieldValue.arrayUnion(userId),
    });
    return { ...(data as Notification), is_read: true };
  }
};

/**
 * Pure Database Operation: Mark all notifications as read for a user.
 */
export const markAllNotificationsReadDb = async (userId: string): Promise<number> => {
  const [userSnap, broadcastSnap] = await Promise.all([
    db.collection("notifications").where("user_id", "==", userId).where("is_read", "==", false).get(),
    db.collection("notifications").where("user_id", "==", null).get(),
  ]);

  let updatedCount = 0;
  const batch = db.batch();

  userSnap.docs.forEach((doc) => {
    batch.update(doc.ref, { is_read: true });
    updatedCount++;
  });

  broadcastSnap.docs.forEach((doc) => {
    const data = doc.data();
    if (!data.read_by || !data.read_by.includes(userId)) {
      batch.update(doc.ref, { read_by: FieldValue.arrayUnion(userId) });
      updatedCount++;
    }
  });

  if (updatedCount > 0) {
    await batch.commit();
  }
  return updatedCount;
};

/**
 * Pure Database Operation: Delete/dismiss a single notification.
 */
export const deleteNotificationDb = async (
  id: string,
  userId?: string | null
): Promise<boolean> => {
  const docRef = db.collection("notifications").doc(id);
  const doc = await docRef.get();
  if (!doc.exists) return false;

  const data = doc.data() as any;
  if (userId && data.user_id && data.user_id !== userId) {
    return false;
  }

  if (data.user_id === userId || !userId) {
    // Delete user-specific notification completely
    await docRef.delete();
    return true;
  } else {
    // For global broadcast notification, dismiss for this user without breaking it for other users
    await docRef.update({
      dismissed_by: FieldValue.arrayUnion(userId),
    });
    return true;
  }
};

/**
 * Pure Database Operation: Clear all notifications for a user or admin.
 */
export const clearAllUserNotificationsDb = async (userId: string): Promise<number> => {
  const snapshot = await db.collection("notifications").get();
  let count = 0;
  const chunkSize = 400;
  const docs = snapshot.docs;

  for (let i = 0; i < docs.length; i += chunkSize) {
    const chunk = docs.slice(i, i + chunkSize);
    const batch = db.batch();

    chunk.forEach((doc) => {
      const data = doc.data() as any;
      const targetUserId = data.user_id;

      // If notification belongs directly to this user, delete it completely
      if (targetUserId === userId) {
        batch.delete(doc.ref);
        count++;
      } else if (!targetUserId) {
        // For global broadcast notification, NEVER delete the document! Only append userId to dismissed_by
        if (!Array.isArray(data.dismissed_by) || !data.dismissed_by.includes(userId)) {
          batch.update(doc.ref, { dismissed_by: FieldValue.arrayUnion(userId) });
          count++;
        }
      }
    });

    await batch.commit();
  }

  return count;
};

/**
 * Pure Database Operation: Count unread notifications for a user based on deduplicated items.
 */
export const countUnreadNotificationsDb = async (userId?: string | null): Promise<number> => {
  const { notifications } = await queryUserNotificationsDb(userId, 1, 100);
  return notifications.filter((n) => !n.is_read).length;
};

