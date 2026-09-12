/**
 * Feature Model: Notification
 * Re-exports pure data models from src/models/notification.model
 * Re-exports database operations from src/db/notification.db for backward-compatible module resolution.
 */

export * from "../../../models/notification.model";
import {
  insertNotificationDb,
  batchInsertBroadcastNotificationsDb,
  queryUserNotificationsDb,
  updateNotificationReadDb,
  countUnreadNotificationsDb,
} from "../../../db/notification.db";

export {
  insertNotificationDb as createNotificationModel,
  batchInsertBroadcastNotificationsDb as broadcastNotificationModel,
  queryUserNotificationsDb as getUserNotificationsModel,
  updateNotificationReadDb as markNotificationReadModel,
  countUnreadNotificationsDb as getUnreadCountModel,
};
