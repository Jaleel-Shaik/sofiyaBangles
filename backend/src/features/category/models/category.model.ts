import { db } from "../../../shared/config/firebase";
import { Category } from "../../../shared/types";
import { v4 as uuidv4 } from 'uuid';

export const getCategoriesModel = async (): Promise<Category[]> => {
  const snapshot = await db.collection("categories")
    .where("is_active", "==", true)
    .get();
  
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
  image_url?: string;
  display_order?: number;
  model_type_id?: string;
  size_type?: 'none' | 'standard' | 'custom' | 'both';
  standard_sizes?: string[];
  custom_measurement_fields?: string[];
}): Promise<Category> => {
  const newId = uuidv4();
  const categoryData: Category = {
    id: newId,
    category_name: data.category_name,
    image_url: data.image_url || null,
    display_order: data.display_order || 0,
    is_active: true,
    model_type_id: data.model_type_id || null,
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
  const updateData: any = { ...data, updated_at: new Date().toISOString() };
  Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);

  await db.collection("categories").doc(id).update(updateData);
  
  const doc = await db.collection("categories").doc(id).get();
  return doc.data() as Category;
};

export const deleteCategoryModel = async (id: string): Promise<void> => {
  await db.collection("categories").doc(id).update({
    is_active: false,
    updated_at: new Date().toISOString()
  });
};
