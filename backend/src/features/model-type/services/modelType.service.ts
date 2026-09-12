import {
  getActiveModelTypesDb,
  getModelTypeByIdDb,
  findModelTypeByNameDb,
  insertModelTypeDb,
  updateModelTypeDocDb,
  deleteModelTypeDb,
  countCategoriesByModelDb,
  countProductsByModelDb,
} from "../../../db/modelType.db";
import { ModelType, validateModelTypeConstraints } from "../../../models/modelType.model";

export const getAllModelTypesService = async (): Promise<ModelType[]> => {
  return await getActiveModelTypesDb();
};

export const getModelTypeByIdService = async (id: string): Promise<ModelType | null> => {
  return await getModelTypeByIdDb(id);
};

export const createModelTypeService = async (data: { name: string }): Promise<ModelType> => {
  const trimmedName = data.name.trim();

  // 1. Business Logic: Validate model constraints
  const constraintCheck = validateModelTypeConstraints({ name: trimmedName });
  if (!constraintCheck.valid) {
    throw new Error(constraintCheck.errors.join(", "));
  }

  // 2. Business Logic: Check duplicate model type name via DB
  const duplicate = await findModelTypeByNameDb(trimmedName);
  if (duplicate) {
    throw new Error("MODEL_TYPE_ALREADY_EXISTS");
  }

  // 3. Domain Model construction
  const now = new Date().toISOString();
  const newModelType: ModelType = {
    id: `mt-${Date.now()}`,
    name: trimmedName,
    is_active: true,
    created_at: now,
    updated_at: now,
  };

  // 4. DB persistence
  await insertModelTypeDb(newModelType);
  return newModelType;
};

export const updateModelTypeService = async (
  id: string,
  data: Partial<{ name: string; is_active?: boolean }>,
): Promise<ModelType> => {
  const existing = await getModelTypeByIdDb(id);
  if (!existing) {
    throw new Error("MODEL_TYPE_NOT_FOUND");
  }

  // 1. Business Logic: Validate constraints if name provided
  if (data.name) {
    const constraintCheck = validateModelTypeConstraints({ name: data.name.trim() });
    if (!constraintCheck.valid) {
      throw new Error(constraintCheck.errors.join(", "));
    }

    // 2. Business Logic: Check duplicate model type name via DB
    if (data.name.toLowerCase().trim() !== existing.name.toLowerCase()) {
      const duplicate = await findModelTypeByNameDb(data.name, id);
      if (duplicate) {
        throw new Error("MODEL_TYPE_ALREADY_EXISTS");
      }
    }
  }

  const updateData: Partial<ModelType> = {
    ...data,
    ...(data.name ? { name: data.name.trim() } : {}),
  };

  return await updateModelTypeDocDb(id, updateData);
};

/**
 * Delete a model type ONLY if it has no dependent categories or products.
 * If dependencies exist, throws MODEL_HAS_DEPENDENCIES with counts.
 */
export const deleteModelTypeService = async (id: string): Promise<void> => {
  const existing = await getModelTypeByIdDb(id);
  if (!existing) {
    throw new Error("MODEL_TYPE_NOT_FOUND");
  }

  const [categoryCount, productCount] = await Promise.all([
    countCategoriesByModelDb(id),
    countProductsByModelDb(id),
  ]);

  if (categoryCount > 0 || productCount > 0) {
    const error: any = new Error("MODEL_HAS_DEPENDENCIES");
    error.categoryCount = categoryCount;
    error.productCount = productCount;
    error.modelName = existing.name;
    throw error;
  }

  await deleteModelTypeDb(id);
};
