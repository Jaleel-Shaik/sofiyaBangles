import { Notification } from "../shared/types";

export { Notification };

export type NotificationType = "new_arrival" | "announcement" | "order_status" | "system";

export const NOTIFICATION_CONSTRAINTS = {
  MAX_TITLE_LENGTH: 200,
  MAX_BODY_LENGTH: 1000,
  ALLOWED_TYPES: ["new_arrival", "announcement", "order_status", "system"] as const,
} as const;

export function validateNotificationData(data: { title: string; body?: string | null }): { isValid: boolean; error?: string } {
  if (!data.title || data.title.trim().length === 0) {
    return { isValid: false, error: "Title is required" };
  }
  if (data.title.length > NOTIFICATION_CONSTRAINTS.MAX_TITLE_LENGTH) {
    return { isValid: false, error: `Title must be under ${NOTIFICATION_CONSTRAINTS.MAX_TITLE_LENGTH} characters` };
  }
  if (data.body && data.body.length > NOTIFICATION_CONSTRAINTS.MAX_BODY_LENGTH) {
    return { isValid: false, error: `Body must be under ${NOTIFICATION_CONSTRAINTS.MAX_BODY_LENGTH} characters` };
  }
  return { isValid: true };
}
