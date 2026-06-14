import {
  getCategoriesRepo,
  getCategoryByIdRepo,
  createCategoryRepo,
  updateCategoryRepo,
  deleteCategoryRepo,
} from "../repositories/category.repository";
import { createAuditLogRepo } from "../repositories/audit.repository";
import { CreateCategoryInput, UpdateCategoryInput } from "../validations/category.schema";

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
  actorId: string,
) => {
  const category = await createCategoryRepo(input);

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
  actorId: string,
) => {
  const existing = await getCategoryByIdRepo(id);
  if (!existing) {
    throw new Error("CATEGORY_NOT_FOUND");
  }

  const category = await updateCategoryRepo(id, input);

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
