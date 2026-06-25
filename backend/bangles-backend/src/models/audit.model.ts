import { db } from "../config/firebase";
import { AuditLog } from "../types";
import { v4 as uuidv4 } from 'uuid';

export const createAuditLogModel = async (data: {
  actor_id: string;
  action: string;
  table_name: string;
  record_id?: string;
  old_data?: Record<string, unknown>;
  new_data?: Record<string, unknown>;
}): Promise<AuditLog> => {
  const newId = uuidv4();
  const auditLog: AuditLog = {
    id: newId,
    actor_id: data.actor_id,
    action: data.action,
    table_name: data.table_name,
    record_id: data.record_id || null,
    old_data: data.old_data || null,
    new_data: data.new_data || null,
    created_at: new Date().toISOString()
  };

  await db.collection("audit_logs").doc(newId).set(auditLog);
  return auditLog;
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
      const pDoc = await db.collection("profiles").doc(log.actor_id).get();
      if (pDoc.exists) {
        actor_name = pDoc.data()?.full_name;
      }
    }
    return { ...log, actor_name };
  }));

  return { logs: logsWithActorName, total };
};
