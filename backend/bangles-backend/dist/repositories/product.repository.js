"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchProductsRepo = exports.deleteProductRepo = exports.updateProductRepo = exports.getProductByIdRepo = exports.getProductsRepo = exports.createProductRepo = void 0;
const supabase_1 = require("../config/supabase");
const createProductRepo = async (payload) => {
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
    const result = await supabase_1.pool.query(query, values);
    return result.rows[0];
};
exports.createProductRepo = createProductRepo;
const getProductsRepo = async (options) => {
    const { page, limit, categoryId, search, userId } = options;
    const offset = (page - 1) * limit;
    let whereClause = "WHERE p.is_active = true";
    const values = [];
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
    const countResult = await supabase_1.pool.query(countQuery, values);
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
    const result = await supabase_1.pool.query(dataQuery, values);
    return { products: result.rows, total };
};
exports.getProductsRepo = getProductsRepo;
const getProductByIdRepo = async (id, userId) => {
    let selectFavorite = "";
    let joinFavorite = "";
    const values = [id];
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
    const result = await supabase_1.pool.query(query, values);
    return result.rows[0] || null;
};
exports.getProductByIdRepo = getProductByIdRepo;
const updateProductRepo = async (id, data) => {
    const fields = [];
    const values = [];
    let paramIndex = 1;
    const allowedFields = [
        "product_name",
        "description",
        "price",
        "image_url",
        "category_id",
        "quantity",
        "is_active",
    ];
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
    const result = await supabase_1.pool.query(query, values);
    return result.rows[0];
};
exports.updateProductRepo = updateProductRepo;
const deleteProductRepo = async (id) => {
    // Soft delete
    await supabase_1.pool.query(`UPDATE products SET is_active = false, updated_at = now() WHERE id = $1`, [id]);
};
exports.deleteProductRepo = deleteProductRepo;
const searchProductsRepo = async (query, limit = 20) => {
    const sql = `
    SELECT p.*, c.category_name
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.is_active = true
      AND (p.product_name ILIKE $1 OR p.description ILIKE $1)
    ORDER BY p.created_at DESC
    LIMIT $2
  `;
    const result = await supabase_1.pool.query(sql, [`%${query}%`, limit]);
    return result.rows;
};
exports.searchProductsRepo = searchProductsRepo;
