import { pool } from "../config/supabase";
import { Favorite, Product } from "../types";

export const addFavoriteRepo = async (
  userId: string,
  productId: string,
): Promise<Favorite> => {
  const query = `
    INSERT INTO favorites (user_id, product_id)
    VALUES ($1, $2)
    ON CONFLICT (user_id, product_id) DO NOTHING
    RETURNING *
  `;

  const result = await pool.query(query, [userId, productId]);

  // If already existed, fetch it
  if (result.rows.length === 0) {
    const existing = await pool.query(
      `SELECT * FROM favorites WHERE user_id = $1 AND product_id = $2`,
      [userId, productId],
    );
    return existing.rows[0];
  }

  return result.rows[0];
};

export const removeFavoriteRepo = async (
  userId: string,
  productId: string,
): Promise<void> => {
  await pool.query(
    `DELETE FROM favorites WHERE user_id = $1 AND product_id = $2`,
    [userId, productId],
  );
};

export const getUserFavoritesRepo = async (
  userId: string,
): Promise<Product[]> => {
  const query = `
    SELECT
      p.*,
      c.category_name,
      true AS is_favorited
    FROM favorites f
    JOIN products p ON f.product_id = p.id
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE f.user_id = $1 AND p.is_active = true
    ORDER BY f.created_at DESC
  `;

  const result = await pool.query(query, [userId]);
  return result.rows;
};

export const isFavoritedRepo = async (
  userId: string,
  productId: string,
): Promise<boolean> => {
  const result = await pool.query(
    `SELECT 1 FROM favorites WHERE user_id = $1 AND product_id = $2`,
    [userId, productId],
  );
  return result.rows.length > 0;
};
