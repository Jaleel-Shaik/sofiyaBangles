/**
 * Pure Model Layer: Product Entity, Interfaces, and Value Constraints.
 * This file contains strictly data constraints, schemas, and types.
 * NO database calls are made here.
 */

export interface ProductImage {
  id: string;
  product_id: string;
  image_url: string;
  public_id?: string | null;
  alt_text?: string | null;
  display_order: number;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  size: string;
  sku?: string | null;
  price: number;
  quantity: number;
  status: "active" | "out_of_stock" | "archived";
  created_at: string;
  updated_at: string;
}

export type ProductStatus = "draft" | "active" | "out_of_stock" | "archived";

export interface Product {
  id: string;
  unique_code: string;
  product_name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  category_id: string;
  model_type_id: string;
  category_name?: string;
  model_type_name?: string;
  quantity: number;
  likes: number;
  rating: number;
  reviews: number;
  is_active: boolean;
  status?: ProductStatus;
  deleted_at?: string | null;
  has_variants?: boolean;
  accepts_custom_size?: boolean;
  custom_size_price?: number;
  created_by?: string;
  created_by_role?: "admin" | "super_admin";
  updated_by?: string;
  created_at: string;
  updated_at: string;
  is_favorited?: boolean;
  variants?: ProductVariant[];
  images?: ProductImage[];
}

/**
 * Domain Constraints for Products
 */
export const PRODUCT_CONSTRAINTS = {
  NAME_MIN_LENGTH: 2,
  NAME_MAX_LENGTH: 150,
  MIN_PRICE: 0,
  MAX_PRICE: 10_000_000,
  MIN_QUANTITY: 0,
  MAX_QUANTITY: 1_000_000,
  ALLOWED_STATUSES: ["draft", "active", "out_of_stock", "archived"] as const,
};

/**
 * Validates product constraints against domain rules.
 */
export const validateProductConstraints = (p: Partial<Product>): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (p.product_name !== undefined) {
    if (p.product_name.trim().length < PRODUCT_CONSTRAINTS.NAME_MIN_LENGTH) {
      errors.push(`Product name must be at least ${PRODUCT_CONSTRAINTS.NAME_MIN_LENGTH} characters`);
    }
    if (p.product_name.length > PRODUCT_CONSTRAINTS.NAME_MAX_LENGTH) {
      errors.push(`Product name cannot exceed ${PRODUCT_CONSTRAINTS.NAME_MAX_LENGTH} characters`);
    }
  }

  if (p.price !== undefined && (p.price < PRODUCT_CONSTRAINTS.MIN_PRICE || p.price > PRODUCT_CONSTRAINTS.MAX_PRICE)) {
    errors.push(`Price must be between ${PRODUCT_CONSTRAINTS.MIN_PRICE} and ${PRODUCT_CONSTRAINTS.MAX_PRICE}`);
  }

  if (p.quantity !== undefined && (p.quantity < PRODUCT_CONSTRAINTS.MIN_QUANTITY || p.quantity > PRODUCT_CONSTRAINTS.MAX_QUANTITY)) {
    errors.push(`Quantity must be between ${PRODUCT_CONSTRAINTS.MIN_QUANTITY} and ${PRODUCT_CONSTRAINTS.MAX_QUANTITY}`);
  }

  if (p.status !== undefined && !PRODUCT_CONSTRAINTS.ALLOWED_STATUSES.includes(p.status as any)) {
    errors.push(`Status must be one of: ${PRODUCT_CONSTRAINTS.ALLOWED_STATUSES.join(", ")}`);
  }

  return { valid: errors.length === 0, errors };
};
