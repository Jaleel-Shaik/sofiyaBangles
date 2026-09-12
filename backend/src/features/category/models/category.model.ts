/**
 * Feature Model: Category
 * Re-exports pure data models, entity interfaces, and constraints from src/models/category.model
 * Re-exports database operations from src/db/category.db for backward-compatible module resolution.
 */

export * from "../../../models/category.model";
export {
  getCategoriesDb as getCategoriesModel,
  getCategoryByIdDb as getCategoryByIdModel,
  findCategoryByNameDb as findCategoryByNameModel,
  insertCategoryDb as insertCategoryModel,
  updateCategoryDocDb as updateCategoryDocModel,
  deleteCategoryDb as deleteCategoryModel,
  countProductsByCategoryDb as countProductsByCategoryModel,
  insertCategoryDb as createCategoryModel,
  updateCategoryDocDb as updateCategoryModel,
} from "../../../db/category.db";
