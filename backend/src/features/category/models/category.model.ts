import { db } from "../../../shared/config/firebase";
import { Category } from "../../../shared/types";
import { v4 as uuidv4 } from 'uuid';

export const getCategoriesModel = async (modelTypeId?: string): Promise<Category[]> => {
  let query: FirebaseFirestore.Query = db.collection("categories")
    .where("is_active", "==", true);

  if (modelTypeId) {
    query = query.where("model_type_id", "==", modelTypeId);
  }

  const snapshot = await query.get();
  
  const categories = snapshot.docs.map(doc => doc.data() as Category);
  
  // Sort locally to avoid composite index requirement
  categories.sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
  
  return categories;
};

export const getCategoryByIdModel = async (
  id: string,
): Promise<Category | null> => {
  const doc = await db.collection("categories").doc(id).get();
  if (!doc.exists) return null;
  return doc.data() as Category;
};

export const createCategoryModel = async (data: {
  category_name: string;
  model_type_id: string;
  image_url?: string;
  display_order?: number;
  size_type?: 'none' | 'standard' | 'custom' | 'both';
  standard_sizes?: string[];
  custom_measurement_fields?: string[];
}): Promise<Category> => {
  // Validate model exists
  const modelDoc = await db.collection("model_types").doc(data.model_type_id).get();
  if (!modelDoc.exists) {
    throw new Error("MODEL_TYPE_NOT_FOUND");
  }

  // Check for duplicate category name
  const existingSnapshot = await db.collection("categories").where("is_active", "==", true).get();
  const duplicate = existingSnapshot.docs.some(doc => {
    const docData = doc.data() as Category;
    return docData.category_name.toLowerCase() === data.category_name.toLowerCase();
  });
  if (duplicate) {
    throw new Error("CATEGORY_ALREADY_EXISTS");
  }

  const newId = uuidv4();
  const categoryData: Category = {
    id: newId,
    category_name: data.category_name,
    model_type_id: data.model_type_id,
    image_url: data.image_url || null,
    display_order: data.display_order || 0,
    is_active: true,
    size_type: data.size_type || 'none',
    standard_sizes: data.standard_sizes || [],
    custom_measurement_fields: data.custom_measurement_fields || [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  await db.collection("categories").doc(newId).set(categoryData);
  return categoryData;
};

export const updateCategoryModel = async (
  id: string,
  data: Partial<{ category_name: string; image_url: string; display_order: number; is_active: boolean; model_type_id: string; size_type: string; standard_sizes: string[]; custom_measurement_fields: string[] }>,
): Promise<Category> => {
  // If model_type_id is being changed, validate the new model exists
  if (data.model_type_id) {
    const modelDoc = await db.collection("model_types").doc(data.model_type_id).get();
    if (!modelDoc.exists) {
      throw new Error("MODEL_TYPE_NOT_FOUND");
    }
  }

  // Check for duplicate category name
  if (data.category_name) {
    const existingSnapshot = await db.collection("categories").where("is_active", "==", true).get();
    const duplicate = existingSnapshot.docs.some(doc => {
      const docData = doc.data() as Category;
      return doc.id !== id && docData.category_name.toLowerCase() === data.category_name!.toLowerCase();
    });
    if (duplicate) {
      throw new Error("CATEGORY_ALREADY_EXISTS");
    }
  }

  const updateData: any = { ...data, updated_at: new Date().toISOString() };
  Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);

  await db.collection("categories").doc(id).update(updateData);
  
  const doc = await db.collection("categories").doc(id).get();
  return doc.data() as Category;
};

/**
 * Soft-delete a category. Sets is_active=false and deleted_at.
 * Does NOT delete products — caller must check for dependencies first.
 */
export const deleteCategoryModel = async (id: string): Promise<void> => {
  await db.collection("categories").doc(id).update({
    is_active: false,
    deleted_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });
};

/**
 * Count active products that belong to a category.
 * Used to check dependencies before allowing category deletion.
 */
export const countProductsByCategoryModel = async (categoryId: string): Promise<number> => {
  const snapshot = await db
    .collection("products")
    .where("category_id", "==", categoryId)
    .where("is_active", "==", true)
    .get();
  return snapshot.size;
};
