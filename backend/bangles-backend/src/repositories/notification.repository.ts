import { pool } from "../config/supabase";
import { Notification } from "../types";

export const createNotificationRepo = async (data: {
  title: string;
  body?: string;
  type?: string;
  product_id?: string | null;
  sent_by?: string;
  user_id?: string | null;
}): Promise<Notification> => {
  const query = `
    INSERT INTO notifications (title, body, type, product_id, sent_by, user_id)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
  `;

  const result = await pool.query(query, [
    data.title,
    data.body || null,
    data.type || "new_arrival",
    data.product_id || null,
    data.sent_by || null,
    data.user_id || null,
  ]);

  return result.rows[0];
};

export const broadcastNotificationRepo = async (data: {
  title: string;
  body?: string;
  type?: string;
  product_id?: string | null;
  sent_by: string;
}): Promise<number> => {
  // Insert a notification for every active user
  const query = `
    INSERT INTO notifications (title, body, type, product_id, sent_by, user_id)
    SELECT $1, $2, $3, $4, $5, p.id
    FROM profiles p
    WHERE p.is_active = true AND p.role = 'user'
  `;

  const result = await pool.query(query, [
    data.title,
    data.body || null,
    data.type || "announcement",
    data.product_id || null,
    data.sent_by,
  ]);

  return result.rowCount || 0;
};

export const getUserNotificationsRepo = async (
  userId: string,
  page: number = 1,
  limit: number = 20,
): Promise<{ notifications: Notification[]; total: number }> => {
  const offset = (page - 1) * limit;

  const countResult = await pool.query(
    `SELECT COUNT(*) as total FROM notifications WHERE user_id = $1`,
    [userId],
  );
  const total = parseInt(countResult.rows[0].total, 10);

  const query = `
    SELECT n.*, p.product_name
    FROM notifications n
    LEFT JOIN products p ON n.product_id = p.id
    WHERE n.user_id = $1
    ORDER BY n.created_at DESC
    LIMIT $2 OFFSET $3
  `;

  const result = await pool.query(query, [userId, limit, offset]);

  return { notifications: result.rows, total };
};

export const markNotificationReadRepo = async (
  id: string,
  userId: string,
): Promise<Notification | null> => {
  const query = `
    UPDATE notifications
    SET is_read = true
    WHERE id = $1 AND user_id = $2
    RETURNING *
  `;

  const result = await pool.query(query, [id, userId]);
  return result.rows[0] || null;
};

export const getUnreadCountRepo = async (userId: string): Promise<number> => {
  const result = await pool.query(
    `SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND is_read = false`,
    [userId],
  );
  return parseInt(result.rows[0].count, 10);
};
