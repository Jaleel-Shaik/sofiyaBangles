import { db } from "../shared/config/firebase";
import { ModelType } from "../shared/types";

/**
 * Pure Database Operation: Retrieve all active model types.
 */
export const getActiveModelTypesDb = async (): Promise<ModelType[]> => {
  const snapshot = await db.collection("model_types").get();
  return snapshot.docs
    .map((doc) => doc.data() as ModelType)
    .filter((mt) => mt.is_active !== false);
};

/**
 * Pure Database Operation: Retrieve all model types regardless of status.
 */
export const getAllModelTypesDb = async (): Promise<ModelType[]> => {
  const snapshot = await db.collection("model_types").get();
  return snapshot.docs.map((doc) => doc.data() as ModelType);
};

/**
 * Pure Database Operation: Retrieve model type by ID.
 */
export const getModelTypeByIdDb = async (id: string): Promise<ModelType | null> => {
  const doc = await db.collection("model_types").doc(id).get();
  if (!doc.exists) return null;
  return doc.data() as ModelType;
};

/**
 * Pure Database Operation: Find a model type by name.
 */
export const findModelTypeByNameDb = async (
  name: string,
  excludeId?: string
): Promise<ModelType | null> => {
  const snapshot = await db.collection("model_types").get();
  const trimmed = name.toLowerCase().trim();
  const found = snapshot.docs.find((doc) => {
    if (excludeId && doc.id === excludeId) return false;
    const data = doc.data() as ModelType;
    return data.is_active !== false && data.name.toLowerCase().trim() === trimmed;
  });
  return found ? (found.data() as ModelType) : null;
};

/**
 * Pure Database Operation: Insert a model type document.
 */
export const insertModelTypeDb = async (data: ModelType): Promise<ModelType> => {
  await db.collection("model_types").doc(data.id).set(data);
  return data;
};

/**
 * Pure Database Operation: Update an existing model type document.
 */
export const updateModelTypeDocDb = async (
  id: string,
  data: Partial<ModelType>
): Promise<ModelType> => {
  const updateData: Record<string, unknown> = { ...data, updated_at: new Date().toISOString() };
  Object.keys(updateData).forEach((key) => updateData[key] === undefined && delete updateData[key]);

  await db.collection("model_types").doc(id).update(updateData);
  const doc = await db.collection("model_types").doc(id).get();
  return doc.data() as ModelType;
};

/**
 * Pure Database Operation: Soft-delete a model type document.
 */
export const deleteModelTypeDb = async (id: string): Promise<void> => {
  await db.collection("model_types").doc(id).update({
    is_active: false,
    deleted_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
};

/**
 * Pure Database Operation: Count active categories for a model type.
 */
export const countCategoriesByModelDb = async (modelTypeId: string): Promise<number> => {
  const snapshot = await db
    .collection("categories")
    .where("model_type_id", "==", modelTypeId)
    .where("is_active", "==", true)
    .get();
  return snapshot.size;
};

/**
 * Pure Database Operation: Count active products for a model type.
 */
export const countProductsByModelDb = async (modelTypeId: string): Promise<number> => {
  const snapshot = await db
    .collection("products")
    .where("model_type_id", "==", modelTypeId)
    .where("is_active", "==", true)
    .get();
  return snapshot.size;
};
