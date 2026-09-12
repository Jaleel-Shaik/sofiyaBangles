import { db } from "../shared/config/firebase";
import { AuditLog, UserRole } from "../shared/types";
import { v4 as uuidv4 } from "uuid";

/**
 * Pure Database Operation: Insert an audit log record into Firestore.
 */
export const insertAuditLogDb = async (data: {
  actor_id: string;
  user_type?: UserRole | "system" | "customer";
  action: string;
  table_name?: string;
  record_id?: string;
  old_data?: Record<string, unknown> | null;
  new_data?: Record<string, unknown> | null;
  ip_address?: string;
  correlation_id?: string | null;
  session_id?: string | null;
  api_endpoint?: string | null;
  api_error?: string | null;
  status_code?: number | null;
}): Promise<AuditLog> => {
  const logId = uuidv4();
  const now = new Date().toISOString();

  let safeUserType: UserRole = "admin";
  if (data.user_type === "admin" || data.user_type === "super_admin" || data.user_type === "user") {
    safeUserType = data.user_type;
  } else if (data.user_type === "customer") {
    safeUserType = "user";
  }

  const auditLog: AuditLog = {
    id: logId,
    actor_id: data.actor_id,
    user_type: safeUserType,
    action: data.action,
    table_name: data.table_name || "general",
    record_id: data.record_id || null,
    old_data: data.old_data || null,
    new_data: data.new_data || null,
    correlation_id: data.correlation_id || null,
    session_id: data.session_id || null,
    ip_address: data.ip_address || "internal",
    api_endpoint: data.api_endpoint || null,
    api_error: data.api_error || null,
    status_code: data.status_code || null,
    created_at: now,
  };

  await db.collection("audit_logs").doc(logId).set(auditLog);
  return auditLog;
};

/**
 * Pure Database Operation: Query raw audit logs with optional filters.
 */
export const queryAuditLogsDb = async (
  actorId?: string,
  action?: string
): Promise<AuditLog[]> => {
  let query: FirebaseFirestore.Query = db.collection("audit_logs");
  if (actorId) {
    query = query.where("actor_id", "==", actorId);
  }
  if (action) {
    query = query.where("action", "==", action);
  }
  const snapshot = await query.get();
  return snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id } as AuditLog));
};
