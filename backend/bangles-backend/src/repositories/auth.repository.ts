import { pool } from "../config/supabase";
import { Profile } from "../types";

export const createProfileRepo = async (data: {
  full_name: string;
  email: string;
  password_hash: string;
  phone?: string;
  role?: string;
}): Promise<Profile> => {
  const query = `
    INSERT INTO profiles (full_name, email, password_hash, phone, role)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `;

  const values = [
    data.full_name,
    data.email,
    data.password_hash,
    data.phone || null,
    data.role || "user",
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
};

export const findProfileByEmailRepo = async (
  email: string,
): Promise<Profile | null> => {
  const query = `SELECT * FROM profiles WHERE email = $1`;
  const result = await pool.query(query, [email]);
  return result.rows[0] || null;
};

export const findProfileByIdRepo = async (
  id: string,
): Promise<Profile | null> => {
  const query = `
    SELECT id, full_name, email, phone, avatar_url, role,
           expo_push_token, is_active, created_at, updated_at
    FROM profiles
    WHERE id = $1
  `;
  const result = await pool.query(query, [id]);
  return result.rows[0] || null;
};

export const updateProfileRepo = async (
  id: string,
  data: Partial<Pick<Profile, "full_name" | "phone" | "avatar_url" | "expo_push_token">>,
): Promise<Profile> => {
  const fields: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (data.full_name !== undefined) {
    fields.push(`full_name = $${paramIndex++}`);
    values.push(data.full_name);
  }
  if (data.phone !== undefined) {
    fields.push(`phone = $${paramIndex++}`);
    values.push(data.phone);
  }
  if (data.avatar_url !== undefined) {
    fields.push(`avatar_url = $${paramIndex++}`);
    values.push(data.avatar_url);
  }
  if (data.expo_push_token !== undefined) {
    fields.push(`expo_push_token = $${paramIndex++}`);
    values.push(data.expo_push_token);
  }

  fields.push(`updated_at = now()`);
  values.push(id);

  const query = `
    UPDATE profiles
    SET ${fields.join(", ")}
    WHERE id = $${paramIndex}
    RETURNING id, full_name, email, phone, avatar_url, role,
              expo_push_token, is_active, created_at, updated_at
  `;

  const result = await pool.query(query, values);
  return result.rows[0];
};
