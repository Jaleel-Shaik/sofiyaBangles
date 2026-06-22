import { db } from "../config/firebase";
import { Category } from "../types";
import { v4 as uuidv4 } from 'uuid';

export const getCategoriesRepo = async (): Promise<Category[]> => {
  const snapshot = await db.collection("categories")
    .where("is_active", "==", true)
    .orderBy("display_order")
    .get();
  
  return snapshot.docs.map(doc => doc.data() as Category);
};

export const getCategoryByIdRepo = async (
  id: string,
): Promise<Category | null> => {
  const doc = await db.collection("categories").doc(id).get();
  if (!doc.exists) return null;
  return doc.data() as Category;
};

export const createCategoryRepo = async (data: {
  category_name: string;
  image_url?: string;
  display_order?: number;
}): Promise<Category> => {
  const newId = uuidv4();
  const categoryData: Category = {
    id: newId,
    category_name: data.category_name,
    image_url: data.image_url || null,
    display_order: data.display_order || 0,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  await db.collection("categories").doc(newId).set(categoryData);
  return categoryData;
};

export const updateCategoryRepo = async (
  id: string,
  data: Partial<{ category_name: string; image_url: string; display_order: number; is_active: boolean }>,
): Promise<Category> => {
  const updateData: any = { ...data, updated_at: new Date().toISOString() };
  Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);

  await db.collection("categories").doc(id).update(updateData);
  
  const doc = await db.collection("categories").doc(id).get();
  return doc.data() as Category;
};

export const deleteCategoryRepo = async (id: string): Promise<void> => {
  await db.collection("categories").doc(id).update({
    is_active: false,
    updated_at: new Date().toISOString()
  });
};
