import { db } from "../config/firebase";
import { AuditLog, UserType } from "../types";
import { v4 as uuidv4 } from "uuid";
import { getIdentityNameModel } from "./identity.model";
import { toISTISO, nowISTISO } from "../utils/datetime";

/**
 * Permanent audit trail. Besides generic CRUD actions it also records
 * session telemetry (login_time, logout_time, ip_address) and the API
 * problems a user faced (api_endpoint, api_error, status_code).
 */
export const createAuditLogModel = async (data: {
  actor_id: string;
  action: string;
  table_name?: string | null;
  record_id?: string | null;
  user_type?: UserType | null;
  old_data?: Record<string, unknown> | null;
  new_data?: Record<string, unknown> | null;
  session_id?: string | null;
  correlation_id?: string | null;
  ip_address?: string;
  api_endpoint?: string | null;
  api_error?: string | null;
  status_code?: number | null;
}): Promise<AuditLog> => {
  const newId = uuidv4();
  const auditLog: AuditLog = {
    id: newId,
    actor_id: data.actor_id,
    user_type: data.user_type || null,
    action: data.action,
    table_name: data.table_name || null,
    record_id: data.record_id || null,
    old_data: data.old_data || null,
    new_data: data.new_data || null,
    session_id: data.session_id || null,
    correlation_id: data.correlation_id || null,
    ip_address: data.ip_address || "",
    api_endpoint: data.api_endpoint || null,
    api_error: data.api_error || null,
    status_code: data.status_code || null,
    created_at: new Date().toISOString(), // Standard UTC timestamp
  };

  await db.collection("audit_logs").doc(newId).set(auditLog);
  return auditLog;
};

/** Finds the most recent audit record for a given action + record id (e.g. LOGIN_SUCCESS + session id). */
export const findAuditLogByRecordModel = async (
  action: string,
  recordId: string,
): Promise<AuditLog | null> => {
  const snapshot = await db
    .collection("audit_logs")
    .where("action", "==", action)
    .where("record_id", "==", recordId)
    .limit(1)
    .get();
  if (snapshot.empty) return null;
  return snapshot.docs[0].data() as AuditLog;
};


export const getAuditLogsModel = async (
  page: number = 1,
  limit: number = 50,
): Promise<{ logs: AuditLog[]; total: number }> => {
  const query = db.collection("audit_logs");
  const countSnapshot = await query.count().get();
  const total = countSnapshot.data().count;

  const offset = (page - 1) * limit;

  const snapshot = await query.orderBy("created_at", "desc").get();

  // Apply pagination in memory
  const allDocs = snapshot.docs.map(doc => doc.data() as AuditLog);
  const paginated = allDocs.slice(offset, offset + limit);

  const logsWithActorName = await Promise.all(paginated.map(async (log) => {
    let actor_name = undefined;
    if (log.actor_id) {
      actor_name = await getIdentityNameModel(log.actor_id);
    }
    return { ...log, actor_name };
  }));

  return { logs: logsWithActorName, total };
};
