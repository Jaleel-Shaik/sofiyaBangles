import {
  broadcastNotificationRepo,
  getUserNotificationsRepo,
  markNotificationReadRepo,
  getUnreadCountRepo,
} from "../repositories/notification.repository";
import { createAuditLogRepo } from "../repositories/audit.repository";
import { BroadcastNotificationInput } from "../validations/notification.schema";

export const broadcastNotificationService = async (
  input: BroadcastNotificationInput,
  actorId: string,
) => {
  const sentCount = await broadcastNotificationRepo({
    title: input.title,
    body: input.body,
    type: input.type,
    product_id: input.product_id,
    sent_by: actorId,
  });

  await createAuditLogRepo({
    actor_id: actorId,
    action: "NOTIFICATION_BROADCAST",
    table_name: "notifications",
    new_data: { title: input.title, sent_to_count: sentCount },
  });

  return { sentCount };
};

export const getUserNotificationsService = async (
  userId: string,
  page?: number,
  limit?: number,
) => {
  return getUserNotificationsRepo(userId, page, limit);
};

export const markNotificationReadService = async (
  id: string,
  userId: string,
) => {
  const notification = await markNotificationReadRepo(id, userId);
  if (!notification) {
    throw new Error("NOTIFICATION_NOT_FOUND");
  }
  return notification;
};

export const getUnreadCountService = async (userId: string) => {
  return getUnreadCountRepo(userId);
};
