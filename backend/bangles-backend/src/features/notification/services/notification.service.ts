import {
  broadcastNotificationModel,
  getUserNotificationsModel,
  markNotificationReadModel,
  getUnreadCountModel,
} from "../models/notification.model";
import { createAuditLogModel } from "../../../shared/models/audit.model";
import { BroadcastNotificationInput } from "../validations/notification.validation";

export const broadcastNotificationService = async (
  input: BroadcastNotificationInput,
  actorId: string,
) => {
  const sentCount = await broadcastNotificationModel({
    title: input.title,
    body: input.body,
    type: input.type,
    product_id: input.product_id,
    sent_by: actorId,
  });

  await createAuditLogModel({
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
  return getUserNotificationsModel(userId, page, limit);
};

export const markNotificationReadService = async (
  id: string,
  userId: string,
) => {
  const notification = await markNotificationReadModel(id, userId);
  if (!notification) {
    throw new Error("NOTIFICATION_NOT_FOUND");
  }
  return notification;
};

export const getUnreadCountService = async (userId: string) => {
  return getUnreadCountModel(userId);
};
