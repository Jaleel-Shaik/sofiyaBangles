import {
  getModelTypesModel,
  getModelTypeByIdModel,
  createModelTypeModel,
  updateModelTypeModel,
  deleteModelTypeModel,
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

export const deleteModelTypeService = async (id: string) => {
  return await deleteModelTypeModel(id);
};
