/**
 * Feature Model: ModelType
 * Re-exports pure data models, entity interfaces, and constraints from src/models/modelType.model
 * Re-exports database operations from src/db/modelType.db for backward-compatible module resolution.
 */

export * from "../../../models/modelType.model";
export {
  getActiveModelTypesDb as getModelTypesModel,
  getAllModelTypesDb as getAllModelTypesModel,
  getModelTypeByIdDb as getModelTypeByIdModel,
  findModelTypeByNameDb as findModelTypeByNameModel,
  insertModelTypeDb as insertModelTypeModel,
  updateModelTypeDocDb as updateModelTypeDocModel,
  insertModelTypeDb as createModelTypeModel,
  updateModelTypeDocDb as updateModelTypeModel,
  deleteModelTypeDb as deleteModelTypeModel,
  countCategoriesByModelDb as countCategoriesByModelModel,
  countProductsByModelDb as countProductsByModelModel,
} from "../../../db/modelType.db";
