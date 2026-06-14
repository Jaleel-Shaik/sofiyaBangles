import { pool } from "../config/supabase";
import { Profile } from "../types";

export const getAllUsersRepo = async (options: {
  page: number;
  limit: number;
  role?: string;
  search?: string;
}): Promise<{ users: Omit<Profile, "password_hash">[]; total: number }> => {
  const { page, limit, role, search } = options;
  const offset = (page - 1) * limit;

  let whereClause = "WHERE 1=1";
  const values: unknown[] = [];
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
  const countResult = await pool.query(countQuery, values);
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

  const result = await pool.query(dataQuery, values);

  return { users: result.rows, total };
};

export const getUserByIdRepo = async (
  id: string,
): Promise<Omit<Profile, "password_hash"> | null> => {
  const query = `
    SELECT id, full_name, email, phone, avatar_url, role,
           is_active, created_at, updated_at
    FROM profiles
    WHERE id = $1
  `;

  const result = await pool.query(query, [id]);
  return result.rows[0] || null;
};

export const updateUserRoleRepo = async (
  id: string,
  role: string,
): Promise<Omit<Profile, "password_hash">> => {
  const query = `
    UPDATE profiles
    SET role = $1, updated_at = now()
    WHERE id = $2
    RETURNING id, full_name, email, phone, avatar_url, role,
              is_active, created_at, updated_at
  `;

  const result = await pool.query(query, [role, id]);
  return result.rows[0];
};
