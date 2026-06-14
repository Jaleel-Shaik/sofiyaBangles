"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isFavoritedRepo = exports.getUserFavoritesRepo = exports.removeFavoriteRepo = exports.addFavoriteRepo = void 0;
const supabase_1 = require("../config/supabase");
const addFavoriteRepo = async (userId, productId) => {
    const query = `
    INSERT INTO favorites (user_id, product_id)
    VALUES ($1, $2)
    ON CONFLICT (user_id, product_id) DO NOTHING
    RETURNING *
  `;
    const result = await supabase_1.pool.query(query, [userId, productId]);
    // If already existed, fetch it
    if (result.rows.length === 0) {
        const existing = await supabase_1.pool.query(`SELECT * FROM favorites WHERE user_id = $1 AND product_id = $2`, [userId, productId]);
        return existing.rows[0];
    }
    return result.rows[0];
};
exports.addFavoriteRepo = addFavoriteRepo;
const removeFavoriteRepo = async (userId, productId) => {
    await supabase_1.pool.query(`DELETE FROM favorites WHERE user_id = $1 AND product_id = $2`, [userId, productId]);
};
exports.removeFavoriteRepo = removeFavoriteRepo;
const getUserFavoritesRepo = async (userId) => {
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
    const result = await supabase_1.pool.query(query, [userId]);
    return result.rows;
};
exports.getUserFavoritesRepo = getUserFavoritesRepo;
const isFavoritedRepo = async (userId, productId) => {
    const result = await supabase_1.pool.query(`SELECT 1 FROM favorites WHERE user_id = $1 AND product_id = $2`, [userId, productId]);
    return result.rows.length > 0;
};
exports.isFavoritedRepo = isFavoritedRepo;
