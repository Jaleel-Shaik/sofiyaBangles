"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateUserRoleRepo = exports.getUserByIdRepo = exports.getAllUsersRepo = void 0;
const supabase_1 = require("../config/supabase");
const getAllUsersRepo = async (options) => {
    const { page, limit, role, search } = options;
    const offset = (page - 1) * limit;
    let whereClause = "WHERE 1=1";
    const values = [];
    let paramIndex = 1;
    if (role) {
        whereClause += ` AND role = $${paramIndex++}`;
        values.push(role);
    }
    if (search) {
        whereClause += ` AND (full_name ILIKE $${paramIndex} OR email ILIKE $${paramIndex})`;
        paramIndex++;
        values.push(`%${search}%`);
    }
    const countQuery = `SELECT COUNT(*) as total FROM profiles ${whereClause}`;
    const countResult = await supabase_1.pool.query(countQuery, values);
    const total = parseInt(countResult.rows[0].total, 10);
    const dataQuery = `
    SELECT id, full_name, email, phone, avatar_url, role,
           is_active, created_at, updated_at
    FROM profiles
    ${whereClause}
    ORDER BY created_at DESC
    LIMIT $${paramIndex++} OFFSET $${paramIndex}
  `;
    values.push(limit, offset);
    const result = await supabase_1.pool.query(dataQuery, values);
    return { users: result.rows, total };
};
exports.getAllUsersRepo = getAllUsersRepo;
const getUserByIdRepo = async (id) => {
    const query = `
    SELECT id, full_name, email, phone, avatar_url, role,
           is_active, created_at, updated_at
    FROM profiles
    WHERE id = $1
  `;
    const result = await supabase_1.pool.query(query, [id]);
    return result.rows[0] || null;
};
exports.getUserByIdRepo = getUserByIdRepo;
const updateUserRoleRepo = async (id, role) => {
    const query = `
    UPDATE profiles
    SET role = $1, updated_at = now()
    WHERE id = $2
    RETURNING id, full_name, email, phone, avatar_url, role,
              is_active, created_at, updated_at
  `;
    const result = await supabase_1.pool.query(query, [role, id]);
    return result.rows[0];
};
exports.updateUserRoleRepo = updateUserRoleRepo;
