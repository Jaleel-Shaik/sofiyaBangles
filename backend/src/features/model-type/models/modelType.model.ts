import { db } from "../../../shared/config/firebase";
import { ModelType } from "../../../shared/types";

export const getModelTypesModel = async (): Promise<ModelType[]> => {
  const snapshot = await db.collection("model_types").get();
  return snapshot.docs
    .map(doc => doc.data() as ModelType)
    .filter(mt => mt.is_active !== false); // Backward compat: treat missing is_active as true
};

export const getAllModelTypesModel = async (): Promise<ModelType[]> => {
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
  // Check for duplicate model type name
  const existingSnapshot = await db.collection("model_types").get();
  const duplicate = existingSnapshot.docs.some(doc => {
    const docData = doc.data() as ModelType;
    return docData.is_active !== false && docData.name.toLowerCase() === data.name.toLowerCase();
  });
  if (duplicate) {
    throw new Error("MODEL_TYPE_ALREADY_EXISTS");
  }
  const newId = `mt-${Date.now()}`;
  const mtData: ModelType = {
    id: newId,
    name: data.name,
    is_active: true,
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
  // Check for duplicate model type name
  if (data.name) {
    const existingSnapshot = await db.collection("model_types").get();
    const duplicate = existingSnapshot.docs.some(doc => {
      const docData = doc.data() as ModelType;
      return doc.id !== id && docData.is_active !== false && docData.name.toLowerCase() === data.name!.toLowerCase();
    });
    if (duplicate) {
      throw new Error("MODEL_TYPE_ALREADY_EXISTS");
    }
  }
  const updateData: any = { ...data, updated_at: new Date().toISOString() };
  Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);

  await db.collection("model_types").doc(id).update(updateData);
  
  const doc = await db.collection("model_types").doc(id).get();
  return doc.data() as ModelType;
};

/**
 * Soft-delete a model type. Does NOT hard-delete.
 * Caller must check for dependencies first.
 */
export const deleteModelTypeModel = async (id: string): Promise<void> => {
  await db.collection("model_types").doc(id).update({
    is_active: false,
    deleted_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });
};

/**
 * Count active categories that belong to a model type.
 */
export const countCategoriesByModelModel = async (modelTypeId: string): Promise<number> => {
  const snapshot = await db
    .collection("categories")
    .where("model_type_id", "==", modelTypeId)
    .where("is_active", "==", true)
    .get();
  return snapshot.size;
};

/**
 * Count active products that belong to a model type.
 */
export const countProductsByModelModel = async (modelTypeId: string): Promise<number> => {
  const snapshot = await db
    .collection("products")
    .where("model_type_id", "==", modelTypeId)
    .where("is_active", "==", true)
    .get();
  return snapshot.size;
};
