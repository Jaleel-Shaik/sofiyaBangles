"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRecentSignupsRepo = exports.getProductsByCategoryRepo = exports.getOverviewAnalyticsRepo = void 0;
const supabase_1 = require("../config/supabase");
const getOverviewAnalyticsRepo = async () => {
    const result = await supabase_1.pool.query(`
    SELECT
      (SELECT COUNT(*) FROM products WHERE is_active = true)::int AS "activeProducts",
      (SELECT COUNT(*) FROM products)::int AS "totalProducts",
      (SELECT COUNT(*) FROM categories WHERE is_active = true)::int AS "totalCategories",
      (SELECT COUNT(*) FROM profiles WHERE role = 'user')::int AS "totalUsers",
      (SELECT COUNT(*) FROM favorites)::int AS "totalFavorites"
  `);
    return result.rows[0];
};
exports.getOverviewAnalyticsRepo = getOverviewAnalyticsRepo;
const getProductsByCategoryRepo = async () => {
    const result = await supabase_1.pool.query(`
    SELECT
      c.category_name,
      COUNT(p.id)::int AS count
    FROM categories c
    LEFT JOIN products p ON c.id = p.category_id AND p.is_active = true
    WHERE c.is_active = true
    GROUP BY c.id, c.category_name
    ORDER BY count DESC
  `);
    return result.rows;
};
exports.getProductsByCategoryRepo = getProductsByCategoryRepo;
const getRecentSignupsRepo = async (days = 30) => {
    const result = await supabase_1.pool.query(`
    SELECT
      DATE(created_at) AS date,
      COUNT(*)::int AS count
    FROM profiles
    WHERE created_at >= NOW() - INTERVAL '1 day' * $1
      AND role = 'user'
    GROUP BY DATE(created_at)
    ORDER BY date
  `, [days]);
    return result.rows;
};
exports.getRecentSignupsRepo = getRecentSignupsRepo;
