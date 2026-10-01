import {
  batchInsertBroadcastNotificationsDb,
  queryUserNotificationsDb,
  updateNotificationReadDb,
  markAllNotificationsReadDb,
  deleteNotificationDb,
  clearAllUserNotificationsDb,
  countUnreadNotificationsDb,
} from "../../../db/notification.db";
import { insertAuditLogDb } from "../../../db/audit.db";
import { BroadcastNotificationInput } from "../validations/notification.validation";

export const broadcastNotificationService = async (
  input: BroadcastNotificationInput,
  actorId: string,
) => {
  const sentCount = await batchInsertBroadcastNotificationsDb({
    title: input.title,
    body: input.body,
    type: input.type,
    product_id: input.product_id,
    sent_by: actorId,
  });

  await insertAuditLogDb({
    actor_id: actorId,
    action: "NOTIFICATION_BROADCAST",
    table_name: "notifications",
    new_data: { title: input.title, sent_to_count: sentCount },
  });

  return { sentCount };
};

export const getUserNotificationsService = async (
  userId?: string | null,
  page?: number,
  limit?: number,
) => {
  return queryUserNotificationsDb(userId, page, limit);
};

export const markNotificationReadService = async (
  id: string,
  userId: string,
) => {
  const notification = await updateNotificationReadDb(id, userId);
  if (!notification) {
    throw new Error("NOTIFICATION_NOT_FOUND");
  }
  return notification;
};

export const markAllNotificationsReadService = async (userId: string) => {
  return markAllNotificationsReadDb(userId);
};

export const deleteNotificationService = async (id: string, userId?: string | null) => {
  const success = await deleteNotificationDb(id, userId);
  if (!success) {
    throw new Error("NOTIFICATION_NOT_FOUND");
  }
  return { success: true };
};

export const clearAllNotificationsService = async (userId: string) => {
  const count = await clearAllUserNotificationsDb(userId);
  return { clearedCount: count };
};

export const getUnreadCountService = async (userId?: string | null) => {
  return countUnreadNotificationsDb(userId);
};
