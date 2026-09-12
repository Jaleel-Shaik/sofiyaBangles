/**
 * Pure Model Layer: Category Entity, Interfaces, and Value Constraints.
 * This file contains strictly data constraints, schemas, and types.
 * NO database calls are made here.
 */

export type CategorySizeType = "none" | "standard" | "custom" | "both";

export interface Category {
  id: string;
  category_name: string;
  image_url: string | null;
  display_order: number;
  is_active: boolean;
  model_type_id: string;
  size_type?: CategorySizeType;
  standard_sizes?: string[];
  custom_measurement_fields?: string[];
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

/**
 * Domain Constraints for Categories
 */
export const CATEGORY_CONSTRAINTS = {
  NAME_MIN_LENGTH: 2,
  NAME_MAX_LENGTH: 80,
  ALLOWED_SIZE_TYPES: ["none", "standard", "custom", "both"] as const,
};

export const validateCategoryConstraints = (
  c: Partial<Category>
): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (c.category_name !== undefined) {
    if (c.category_name.trim().length < CATEGORY_CONSTRAINTS.NAME_MIN_LENGTH) {
      errors.push(`Category name must be at least ${CATEGORY_CONSTRAINTS.NAME_MIN_LENGTH} characters`);
    }
    if (c.category_name.length > CATEGORY_CONSTRAINTS.NAME_MAX_LENGTH) {
      errors.push(`Category name cannot exceed ${CATEGORY_CONSTRAINTS.NAME_MAX_LENGTH} characters`);
    }
  }

  if (c.size_type !== undefined && !CATEGORY_CONSTRAINTS.ALLOWED_SIZE_TYPES.includes(c.size_type as any)) {
    errors.push(`Size type must be one of: ${CATEGORY_CONSTRAINTS.ALLOWED_SIZE_TYPES.join(", ")}`);
  }

  return { valid: errors.length === 0, errors };
};
