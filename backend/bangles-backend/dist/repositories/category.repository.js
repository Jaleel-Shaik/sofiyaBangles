"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteCategoryRepo = exports.updateCategoryRepo = exports.createCategoryRepo = exports.getCategoryByIdRepo = exports.getCategoriesRepo = void 0;
const supabase_1 = require("../config/supabase");
const getCategoriesRepo = async () => {
    const result = await supabase_1.pool.query(`SELECT * FROM categories WHERE is_active = true ORDER BY display_order, category_name`);
    return result.rows;
};
exports.getCategoriesRepo = getCategoriesRepo;
const getCategoryByIdRepo = async (id) => {
    const result = await supabase_1.pool.query(`SELECT * FROM categories WHERE id = $1`, [
        id,
    ]);
    return result.rows[0] || null;
};
exports.getCategoryByIdRepo = getCategoryByIdRepo;
const createCategoryRepo = async (data) => {
    const query = `
    INSERT INTO categories (category_name, image_url, display_order)
    VALUES ($1, $2, $3)
    RETURNING *
  `;
    const result = await supabase_1.pool.query(query, [
        data.category_name,
        data.image_url || null,
        data.display_order || 0,
    ]);
    return result.rows[0];
};
exports.createCategoryRepo = createCategoryRepo;
const updateCategoryRepo = async (id, data) => {
    const fields = [];
    const values = [];
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
    const result = await supabase_1.pool.query(query, values);
    return result.rows[0];
};
exports.updateCategoryRepo = updateCategoryRepo;
const deleteCategoryRepo = async (id) => {
    await supabase_1.pool.query(`UPDATE categories SET is_active = false, updated_at = now() WHERE id = $1`, [id]);
};
exports.deleteCategoryRepo = deleteCategoryRepo;
