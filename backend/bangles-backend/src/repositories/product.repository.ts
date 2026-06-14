import { pool } from "../config/supabase";
import { Product } from "../types";

export const createProductRepo = async (payload: {
  product_name: string;
  description?: string;
  price: number;
  image_url?: string;
  category_id?: string;
  quantity?: number;
}): Promise<Product> => {
  const query = `
    INSERT INTO products
      (product_name, description, price, image_url, category_id, quantity)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
  `;

  const values = [
    payload.product_name,
    payload.description || null,
    payload.price,
    payload.image_url || null,
    payload.category_id || null,
    payload.quantity || 0,
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
};

export const getProductsRepo = async (options: {
  page: number;
  limit: number;
  categoryId?: string;
  search?: string;
  userId?: string;
}): Promise<{ products: Product[]; total: number }> => {
  const { page, limit, categoryId, search, userId } = options;
  const offset = (page - 1) * limit;

  let whereClause = "WHERE p.is_active = true";
  const values: unknown[] = [];
  let paramIndex = 1;

  if (categoryId) {
    whereClause += ` AND p.category_id = $${paramIndex++}`;
    values.push(categoryId);
  }

  if (search) {
    whereClause += ` AND (p.product_name ILIKE $${paramIndex} OR p.description ILIKE $${paramIndex})`;
    paramIndex++;
    values.push(`%${search}%`);
  }

  // Count query
  const countQuery = `
    SELECT COUNT(*) as total
    FROM products p
    ${whereClause}
  `;
  const countResult = await pool.query(countQuery, values);
  const total = parseInt(countResult.rows[0].total, 10);

  // Data query with optional favorite join
  let selectFavorite = "";
  let joinFavorite = "";

  if (userId) {
    selectFavorite = `, CASE WHEN f.id IS NOT NULL THEN true ELSE false END AS is_favorited`;
    joinFavorite = `LEFT JOIN favorites f ON p.id = f.product_id AND f.user_id = $${paramIndex++}`;
    values.push(userId);
  }

  const dataQuery = `
    SELECT
      p.*,
      c.category_name
      ${selectFavorite}
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    ${joinFavorite}
    ${whereClause}
    ORDER BY p.created_at DESC
    LIMIT $${paramIndex++} OFFSET $${paramIndex}
  `;

  values.push(limit, offset);

  const result = await pool.query(dataQuery, values);

  return { products: result.rows, total };
};

export const getProductByIdRepo = async (
  id: string,
  userId?: string,
): Promise<Product | null> => {
  let selectFavorite = "";
  let joinFavorite = "";
  const values: unknown[] = [id];

  if (userId) {
    selectFavorite = `, CASE WHEN f.id IS NOT NULL THEN true ELSE false END AS is_favorited`;
    joinFavorite = `LEFT JOIN favorites f ON p.id = f.product_id AND f.user_id = $2`;
    values.push(userId);
  }

  const query = `
    SELECT
      p.*,
      c.category_name
      ${selectFavorite}
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    ${joinFavorite}
    WHERE p.id = $1
  `;

  const result = await pool.query(query, values);
  return result.rows[0] || null;
};

export const updateProductRepo = async (
  id: string,
  data: Partial<{
    product_name: string;
    description: string;
    price: number;
    image_url: string;
    category_id: string;
    quantity: number;
    is_active: boolean;
  }>,
): Promise<Product> => {
  const fields: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  const allowedFields = [
    "product_name",
    "description",
    "price",
    "image_url",
    "category_id",
    "quantity",
    "is_active",
  ] as const;

  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      fields.push(`${field} = $${paramIndex++}`);
      values.push(data[field]);
    }
  }

  fields.push("updated_at = now()");
  values.push(id);

  const query = `
    UPDATE products
    SET ${fields.join(", ")}
    WHERE id = $${paramIndex}
    RETURNING *
  `;

  const result = await pool.query(query, values);
  return result.rows[0];
};

export const deleteProductRepo = async (id: string): Promise<void> => {
  // Soft delete
  await pool.query(
    `UPDATE products SET is_active = false, updated_at = now() WHERE id = $1`,
    [id],
  );
};

export const searchProductsRepo = async (
  query: string,
  limit: number = 20,
): Promise<Product[]> => {
  const sql = `
    SELECT p.*, c.category_name
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.is_active = true
      AND (p.product_name ILIKE $1 OR p.description ILIKE $1)
    ORDER BY p.created_at DESC
    LIMIT $2
  `;

  const result = await pool.query(sql, [`%${query}%`, limit]);
  return result.rows;
};