import {
  getCategoriesRepo,
  getCategoryByIdRepo,
  createCategoryRepo,
  updateCategoryRepo,
  deleteCategoryRepo,
} from "../repositories/category.repository";
import { createAuditLogRepo } from "../repositories/audit.repository";
import { CreateCategoryInput, UpdateCategoryInput } from "../validations/category.schema";
import { uploadToCloudinary } from "../utils/cloudinary-upload";

export const getCategoriesService = async () => {
  return getCategoriesRepo();
};

export const getCategoryByIdService = async (id: string) => {
  const category = await getCategoryByIdRepo(id);
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

  const category = await createCategoryRepo({
    ...input,
    ...(imageUrl && { image_url: imageUrl }),
  });

  await createAuditLogRepo({
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
  const existing = await getCategoryByIdRepo(id);
  if (!existing) {
    throw new Error("CATEGORY_NOT_FOUND");
  }

  let imageUrl: string | undefined;
  if (file) {
    imageUrl = await uploadToCloudinary(file);
  }

  const category = await updateCategoryRepo(id, {
    ...input,
    ...(imageUrl && { image_url: imageUrl }),
  });

  await createAuditLogRepo({
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
  const existing = await getCategoryByIdRepo(id);
  if (!existing) {
    throw new Error("CATEGORY_NOT_FOUND");
  }

  await deleteCategoryRepo(id);

  await createAuditLogRepo({
    actor_id: actorId,
    action: "CATEGORY_DELETED",
    table_name: "categories",
    record_id: id,
    old_data: { category_name: existing.category_name },
  });
};
