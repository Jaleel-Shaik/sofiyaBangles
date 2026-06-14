import { pool } from "../config/supabase";
import { Category } from "../types";

export const getCategoriesRepo = async (): Promise<Category[]> => {
  const result = await pool.query(
    `SELECT * FROM categories WHERE is_active = true ORDER BY display_order, category_name`,
  );
  return result.rows;
};

export const getCategoryByIdRepo = async (
  id: string,
): Promise<Category | null> => {
  const result = await pool.query(`SELECT * FROM categories WHERE id = $1`, [
    id,
  ]);
  return result.rows[0] || null;
};

export const createCategoryRepo = async (data: {
  category_name: string;
  image_url?: string;
  display_order?: number;
}): Promise<Category> => {
  const query = `
    INSERT INTO categories (category_name, image_url, display_order)
    VALUES ($1, $2, $3)
    RETURNING *
  `;

  const result = await pool.query(query, [
    data.category_name,
    data.image_url || null,
    data.display_order || 0,
  ]);
  return result.rows[0];
};

export const updateCategoryRepo = async (
  id: string,
  data: Partial<{ category_name: string; image_url: string; display_order: number; is_active: boolean }>,
): Promise<Category> => {
  const fields: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (data.category_name !== undefined) {
    fields.push(`category_name = $${paramIndex++}`);
    values.push(data.category_name);
  }
  if (data.image_url !== undefined) {
    fields.push(`image_url = $${paramIndex++}`);
    values.push(data.image_url);
  }
  if (data.display_order !== undefined) {
    fields.push(`display_order = $${paramIndex++}`);
    values.push(data.display_order);
  }
  if (data.is_active !== undefined) {
    fields.push(`is_active = $${paramIndex++}`);
    values.push(data.is_active);
  }

  fields.push("updated_at = now()");
  values.push(id);

  const query = `
    UPDATE categories
    SET ${fields.join(", ")}
    WHERE id = $${paramIndex}
    RETURNING *
  `;

  const result = await pool.query(query, values);
  return result.rows[0];
};

export const deleteCategoryRepo = async (id: string): Promise<void> => {
  await pool.query(
    `UPDATE categories SET is_active = false, updated_at = now() WHERE id = $1`,
    [id],
  );
};
