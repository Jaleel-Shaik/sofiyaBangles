import {
  getModelTypesModel,
  getModelTypeByIdModel,
  createModelTypeModel,
  updateModelTypeModel,
  deleteModelTypeModel,
  countCategoriesByModelModel,
  countProductsByModelModel,
} from "../models/modelType.model";

export const getAllModelTypesService = async () => {
  return await getModelTypesModel();
};

export const getModelTypeByIdService = async (id: string) => {
  return await getModelTypeByIdModel(id);
};

export const createModelTypeService = async (data: any) => {
  return await createModelTypeModel(data);
};

export const updateModelTypeService = async (id: string, data: any) => {
  return await updateModelTypeModel(id, data);
};

/**
 * Delete a model type ONLY if it has no dependent categories or products.
 * If dependencies exist, throws MODEL_HAS_DEPENDENCIES with counts.
 */
export const deleteModelTypeService = async (id: string) => {
  const existing = await getModelTypeByIdModel(id);
  if (!existing) {
    throw new Error("MODEL_TYPE_NOT_FOUND");
  }

  const [categoryCount, productCount] = await Promise.all([
    countCategoriesByModelModel(id),
    countProductsByModelModel(id),
  ]);

  if (categoryCount > 0 || productCount > 0) {
    const error: any = new Error("MODEL_HAS_DEPENDENCIES");
    error.categoryCount = categoryCount;
    error.productCount = productCount;
    error.modelName = existing.name;
    throw error;
  }

  await deleteModelTypeModel(id);
};
