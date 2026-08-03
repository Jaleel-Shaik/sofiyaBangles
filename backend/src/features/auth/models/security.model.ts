import { db } from "../../../shared/config/firebase";
import { DeviceInformation, SecurityEvent, UserType } from "../../../shared/types";
import { v4 as uuidv4 } from "uuid";

/**
 * Long-retention security events: brute force, account lock, token rotation,
 * 2FA changes, suspicious logins, etc. Kept much longer than audit logs.
 */
export const createSecurityEventModel = async (data: {
  userId?: string | null;
  userType?: UserType | null;
  eventType: string;
  severity: "info" | "warning" | "critical";
  deviceInfo?: DeviceInformation;
  details?: string;
}): Promise<SecurityEvent> => {
  const id = uuidv4();
  const event: SecurityEvent = {
    id,
    user_id: data.userId ?? null,
    user_type: data.userType ?? null,
    event_type: data.eventType,
    severity: data.severity,
    ip_address: data.deviceInfo?.ip_address || "",
    device_info: data.deviceInfo || {},
    details: data.details || null,
    created_at: new Date().toISOString(),
  };

  await db.collection("security_events").doc(id).set(event);
  return event;
};
