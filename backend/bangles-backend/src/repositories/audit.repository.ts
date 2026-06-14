import { pool } from "../config/supabase";
import { AuditLog } from "../types";

export const createAuditLogRepo = async (data: {
  actor_id: string;
  action: string;
  table_name: string;
  record_id?: string;
  old_data?: Record<string, unknown>;
  new_data?: Record<string, unknown>;
}): Promise<AuditLog> => {
  const query = `
    INSERT INTO audit_logs (actor_id, action, table_name, record_id, old_data, new_data)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
  `;

  const result = await pool.query(query, [
    data.actor_id,
    data.action,
    data.table_name,
    data.record_id || null,
    data.old_data ? JSON.stringify(data.old_data) : null,
    data.new_data ? JSON.stringify(data.new_data) : null,
  ]);

  return result.rows[0];
};

export const getAuditLogsRepo = async (
  page: number = 1,
  limit: number = 50,
): Promise<{ logs: AuditLog[]; total: number }> => {
  const offset = (page - 1) * limit;

  const countResult = await pool.query(
    `SELECT COUNT(*) as total FROM audit_logs`,
  );
  const total = parseInt(countResult.rows[0].total, 10);

  const query = `
    SELECT al.*, p.full_name AS actor_name
    FROM audit_logs al
    LEFT JOIN profiles p ON al.actor_id = p.id
    ORDER BY al.created_at DESC
    LIMIT $1 OFFSET $2
  `;

  const result = await pool.query(query, [limit, offset]);

  return { logs: result.rows, total };
};
