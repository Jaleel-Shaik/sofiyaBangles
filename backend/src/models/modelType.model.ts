/**
 * Pure Model Layer: ModelType Entity, Interfaces, and Value Constraints.
 * This file contains strictly data constraints, schemas, and types.
 * NO database calls are made here.
 */

export interface ModelType {
  id: string;
  name: string;
  is_active: boolean;
  display_order?: number;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

/**
 * Domain Constraints for ModelTypes
 */
export const MODEL_TYPE_CONSTRAINTS = {
  NAME_MIN_LENGTH: 2,
  NAME_MAX_LENGTH: 80,
};

export const validateModelTypeConstraints = (
  mt: Partial<ModelType>
): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (mt.name !== undefined) {
    if (mt.name.trim().length < MODEL_TYPE_CONSTRAINTS.NAME_MIN_LENGTH) {
      errors.push(`Model type name must be at least ${MODEL_TYPE_CONSTRAINTS.NAME_MIN_LENGTH} characters`);
    }
    if (mt.name.length > MODEL_TYPE_CONSTRAINTS.NAME_MAX_LENGTH) {
      errors.push(`Model type name cannot exceed ${MODEL_TYPE_CONSTRAINTS.NAME_MAX_LENGTH} characters`);
    }
  }

  return { valid: errors.length === 0, errors };
};
