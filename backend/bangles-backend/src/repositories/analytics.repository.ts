import { pool } from "../config/supabase";
import { OverviewAnalytics, ProductsByCategory } from "../types";

export const getOverviewAnalyticsRepo = async (): Promise<OverviewAnalytics> => {
  const result = await pool.query(`
    SELECT
      (SELECT COUNT(*) FROM products WHERE is_active = true)::int AS "activeProducts",
      (SELECT COUNT(*) FROM products)::int AS "totalProducts",
      (SELECT COUNT(*) FROM categories WHERE is_active = true)::int AS "totalCategories",
      (SELECT COUNT(*) FROM profiles WHERE role = 'user')::int AS "totalUsers",
      (SELECT COUNT(*) FROM favorites)::int AS "totalFavorites"
  `);

  return result.rows[0];
};

export const getProductsByCategoryRepo = async (): Promise<ProductsByCategory[]> => {
  const result = await pool.query(`
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

export const getRecentSignupsRepo = async (
  days: number = 30,
): Promise<{ date: string; count: number }[]> => {
  const result = await pool.query(
    `
    SELECT
      DATE(created_at) AS date,
      COUNT(*)::int AS count
    FROM profiles
    WHERE created_at >= NOW() - INTERVAL '1 day' * $1
      AND role = 'user'
    GROUP BY DATE(created_at)
    ORDER BY date
  `,
    [days],
  );

  return result.rows;
};
