import { v4 as uuidv4 } from "uuid";
import {
  getCategoriesDb,
  getCategoryByIdDb,
  findCategoryByNameDb,
  insertCategoryDb,
  updateCategoryDocDb,
  deleteCategoryDb,
  countProductsByCategoryDb,
} from "../../../db/category.db";
import { getModelTypeByIdDb } from "../../../db/modelType.db";
import { insertAuditLogDb } from "../../../db/audit.db";
import { Category, validateCategoryConstraints } from "../../../models/category.model";
import { CreateCategoryInput, UpdateCategoryInput } from "../validations/category.validation";
import { uploadToCloudinary } from "../../../shared/utils/cloudinary-upload";

export const getCategoriesService = async (modelTypeId?: string): Promise<Category[]> => {
  return getCategoriesDb(modelTypeId);
};

export const getCategoryByIdService = async (id: string): Promise<Category> => {
  const category = await getCategoryByIdDb(id);
  if (!category) {
    throw new Error("CATEGORY_NOT_FOUND");
  }
  return category;
};

export const createCategoryService = async (
  input: CreateCategoryInput,
  file: Express.Multer.File | undefined,
  actorId: string,
): Promise<Category> => {
  // 1. Business Logic: Validate model constraints
  const constraintCheck = validateCategoryConstraints(input);
  if (!constraintCheck.valid) {
    throw new Error(constraintCheck.errors.join(", "));
  }

  // 2. Business Logic: Validate model type exists via DB layer
  if (input.model_type_id && input.model_type_id !== "general") {
    const modelType = await getModelTypeByIdDb(input.model_type_id);
    if (!modelType) {
      throw new Error("MODEL_TYPE_NOT_FOUND");
    }
  }

  // 3. Business Logic: Check duplicate category name via DB layer
  const existingName = await findCategoryByNameDb(input.category_name);
  if (existingName) {
    throw new Error("CATEGORY_ALREADY_EXISTS");
  }

  // 4. Utility: Upload image if provided
  let imageUrl: string | undefined;
  if (file) {
    imageUrl = await uploadToCloudinary(file);
  }

  // 5. Model entity instantiation
  const now = new Date().toISOString();
  const newCategory: Category = {
    id: uuidv4(),
    category_name: input.category_name.trim(),
    image_url: imageUrl ?? null,
    model_type_id: input.model_type_id,
    display_order: input.display_order ?? 0,
    size_type: input.size_type,
    standard_sizes: input.standard_sizes,
    custom_measurement_fields: input.custom_measurement_fields,
    is_active: true,
    created_at: now,
    updated_at: now,
  };

  // 6. DB persistence
  await insertCategoryDb(newCategory);

  // 7. Audit log persistence via DB layer
  await insertAuditLogDb({
    actor_id: actorId,
    action: "CATEGORY_CREATED",
    table_name: "categories",
    record_id: newCategory.id,
    new_data: { category_name: newCategory.category_name, model_type_id: newCategory.model_type_id },
  });

  return newCategory;
};

export const updateCategoryService = async (
  id: string,
  input: UpdateCategoryInput,
  file: Express.Multer.File | undefined,
  actorId: string,
): Promise<Category> => {
  const existing = await getCategoryByIdDb(id);
  if (!existing) {
    throw new Error("CATEGORY_NOT_FOUND");
  }

  // 1. Business Logic: Validate model constraints
  const constraintCheck = validateCategoryConstraints(input);
  if (!constraintCheck.valid) {
    throw new Error(constraintCheck.errors.join(", "));
  }

  // 2. Business Logic: Validate model type if changed
  if (input.model_type_id && input.model_type_id !== existing.model_type_id) {
    const modelType = await getModelTypeByIdDb(input.model_type_id);
    if (!modelType) {
      throw new Error("MODEL_TYPE_NOT_FOUND");
    }
  }

  // 3. Business Logic: Check duplicate name if changed
  if (input.category_name && input.category_name.toLowerCase().trim() !== existing.category_name.toLowerCase()) {
    const duplicate = await findCategoryByNameDb(input.category_name, id);
    if (duplicate) {
      throw new Error("CATEGORY_ALREADY_EXISTS");
    }
  }

  // 4. Utility: Upload image if provided
  let imageUrl: string | undefined;
  if (file) {
    imageUrl = await uploadToCloudinary(file);
  }

  const updateData: Partial<Category> = {
    ...input,
    ...(imageUrl !== undefined && { image_url: imageUrl }),
  };

  // 5. DB update
  const updatedCategory = await updateCategoryDocDb(id, updateData);

  // 6. Audit logging via DB layer
  await insertAuditLogDb({
    actor_id: actorId,
    action: "CATEGORY_UPDATED",
    table_name: "categories",
    record_id: id,
    old_data: { category_name: existing.category_name },
    new_data: { category_name: updatedCategory.category_name },
  });

  return updatedCategory;
};

/**
 * Delete a category ONLY if it has no active products.
 * If products exist, throws CATEGORY_HAS_PRODUCTS with the count.
 * Otherwise, soft-deletes the category (is_active=false, deleted_at=now).
 */
export const deleteCategoryService = async (id: string, actorId: string): Promise<void> => {
  const existing = await getCategoryByIdDb(id);
  if (!existing) {
    throw new Error("CATEGORY_NOT_FOUND");
  }

  // Check for dependent products via DB layer
  const productCount = await countProductsByCategoryDb(id);
  if (productCount > 0) {
    const error: any = new Error("CATEGORY_HAS_PRODUCTS");
    error.productCount = productCount;
    error.categoryName = existing.category_name;
    throw error;
  }

  // Safe to soft-delete — no dependent products
  await deleteCategoryDb(id);

  await insertAuditLogDb({
    actor_id: actorId,
    action: "CATEGORY_DELETED",
    table_name: "categories",
    record_id: id,
    old_data: { category_name: existing.category_name },
  });
};
