import { db } from "../../../shared/config/firebase";
import { v4 as uuidv4 } from 'uuid';

export interface ModelType {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export const getModelTypesModel = async (): Promise<ModelType[]> => {
  const snapshot = await db.collection("model_types").get();
  return snapshot.docs.map(doc => doc.data() as ModelType);
};

export const getModelTypeByIdModel = async (
  id: string,
): Promise<ModelType | null> => {
  const doc = await db.collection("model_types").doc(id).get();
  if (!doc.exists) return null;
  return doc.data() as ModelType;
};

export const createModelTypeModel = async (data: {
  name: string;
}): Promise<ModelType> => {
  const newId = `mt-${Date.now()}`;
  const mtData: ModelType = {
    id: newId,
    name: data.name,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  await db.collection("model_types").doc(newId).set(mtData);
  return mtData;
};

export const updateModelTypeModel = async (
  id: string,
  data: Partial<{ name: string; }>,
): Promise<ModelType> => {
  const updateData: any = { ...data, updated_at: new Date().toISOString() };
  Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);

  await db.collection("model_types").doc(id).update(updateData);
  
  const doc = await db.collection("model_types").doc(id).get();
  return doc.data() as ModelType;
};

export const deleteModelTypeModel = async (id: string): Promise<void> => {
  await db.collection("model_types").doc(id).delete();
};
