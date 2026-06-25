import {
  getCategoriesModel,
  getCategoryByIdModel,
  createCategoryModel,
  updateCategoryModel,
  deleteCategoryModel,
} from "../models/category.model";
import { createAuditLogModel } from "../models/audit.model";
import { CreateCategoryInput, UpdateCategoryInput } from "../validations/category.schema";
import { uploadToCloudinary } from "../utils/cloudinary-upload";

export const getCategoriesService = async () => {
  return getCategoriesModel();
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
    new_data: { category_name: category.category_name },
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

export const deleteCategoryService = async (id: string, actorId: string) => {
  const existing = await getCategoryByIdModel(id);
  if (!existing) {
    throw new Error("CATEGORY_NOT_FOUND");
  }

  await deleteCategoryModel(id);

  await createAuditLogModel({
    actor_id: actorId,
    action: "CATEGORY_DELETED",
    table_name: "categories",
    record_id: id,
    old_data: { category_name: existing.category_name },
  });
};
