"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAuditLogsRepo = exports.createAuditLogRepo = void 0;
const supabase_1 = require("../config/supabase");
const createAuditLogRepo = async (data) => {
    const query = `
    INSERT INTO audit_logs (actor_id, action, table_name, record_id, old_data, new_data)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
  `;
    const result = await supabase_1.pool.query(query, [
        data.actor_id,
        data.action,
        data.table_name,
        data.record_id || null,
        data.old_data ? JSON.stringify(data.old_data) : null,
        data.new_data ? JSON.stringify(data.new_data) : null,
    ]);
    return result.rows[0];
};
exports.createAuditLogRepo = createAuditLogRepo;
const getAuditLogsRepo = async (page = 1, limit = 50) => {
    const offset = (page - 1) * limit;
    const countResult = await supabase_1.pool.query(`SELECT COUNT(*) as total FROM audit_logs`);
    const total = parseInt(countResult.rows[0].total, 10);
    const query = `
    SELECT al.*, p.full_name AS actor_name
    FROM audit_logs al
    LEFT JOIN profiles p ON al.actor_id = p.id
    ORDER BY al.created_at DESC
    LIMIT $1 OFFSET $2
  `;
    const result = await supabase_1.pool.query(query, [limit, offset]);
    return { logs: result.rows, total };
};
exports.getAuditLogsRepo = getAuditLogsRepo;
