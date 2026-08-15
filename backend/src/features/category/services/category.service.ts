import {
  getCategoriesModel,
  getCategoryByIdModel,
  createCategoryModel,
  updateCategoryModel,
  deleteCategoryModel,
  countProductsByCategoryModel,
} from "../models/category.model";
import { createAuditLogModel } from "../../../shared/models/audit.model";
import { CreateCategoryInput, UpdateCategoryInput } from "../validations/category.validation";
import { uploadToCloudinary } from "../../../shared/utils/cloudinary-upload";

export const getCategoriesService = async (modelTypeId?: string) => {
  return getCategoriesModel(modelTypeId);
};

export const getCategoryByIdService = async (id: string) => {
  const category = await getCategoryByIdModel(id);
  if (!category) {
    throw new Error("CATEGORY_NOT_FOUND");
  }
  return category;
};

export const createCategoryService = async (
  input: CreateCategoryInput,
  file: Express.Multer.File | undefined,
  actorId: string,
) => {
  let imageUrl: string | undefined;

  if (file) {
    imageUrl = await uploadToCloudinary(file);
  }

  const category = await createCategoryModel({
    ...input,
    ...(imageUrl && { image_url: imageUrl }),
  });

  await createAuditLogModel({
    actor_id: actorId,
    action: "CATEGORY_CREATED",
    table_name: "categories",
    record_id: category.id,
    new_data: { category_name: category.category_name, model_type_id: category.model_type_id },
  });

  return category;
};

export const updateCategoryService = async (
  id: string,
  input: UpdateCategoryInput,
  file: Express.Multer.File | undefined,
  actorId: string,
) => {
  const existing = await getCategoryByIdModel(id);
  if (!existing) {
    throw new Error("CATEGORY_NOT_FOUND");
  }

  let imageUrl: string | undefined;
  if (file) {
    imageUrl = await uploadToCloudinary(file);
  }

  const category = await updateCategoryModel(id, {
    ...input,
    ...(imageUrl && { image_url: imageUrl }),
  });

  await createAuditLogModel({
    actor_id: actorId,
    action: "CATEGORY_UPDATED",
    table_name: "categories",
    record_id: id,
    old_data: { category_name: existing.category_name },
    new_data: { category_name: category.category_name },
  });

  return category;
};

/**
 * Delete a category ONLY if it has no active products.
 * If products exist, throws CATEGORY_HAS_PRODUCTS with the count.
 * Otherwise, soft-deletes the category (is_active=false, deleted_at=now).
 */
export const deleteCategoryService = async (id: string, actorId: string) => {
  const existing = await getCategoryByIdModel(id);
  if (!existing) {
    throw new Error("CATEGORY_NOT_FOUND");
  }

  // Check for dependent products — REJECT deletion if any exist
  const productCount = await countProductsByCategoryModel(id);
  if (productCount > 0) {
    const error: any = new Error("CATEGORY_HAS_PRODUCTS");
    error.productCount = productCount;
    error.categoryName = existing.category_name;
    throw error;
  }

  // Safe to soft-delete — no dependent products
  await deleteCategoryModel(id);

  await createAuditLogModel({
    actor_id: actorId,
    action: "CATEGORY_DELETED",
    table_name: "categories",
    record_id: id,
    old_data: { category_name: existing.category_name },
  });

  console.log(
    `Category "${existing.category_name}" (${id}) soft-deleted successfully.`
  );
};
