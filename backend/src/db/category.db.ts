import { db } from "../shared/config/firebase";
import { Category } from "../shared/types";

/**
 * Pure Database Operation: Retrieve active categories, optionally filtered by model_type_id.
 */
export const getCategoriesDb = async (modelTypeId?: string): Promise<Category[]> => {
  let query: FirebaseFirestore.Query = db.collection("categories").where("is_active", "==", true);

  if (modelTypeId) {
    query = query.where("model_type_id", "==", modelTypeId);
  }

  const snapshot = await query.get();
  const categories = snapshot.docs.map((doc) => doc.data() as Category);
  categories.sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
  return categories;
};

/**
 * Pure Database Operation: Retrieve category by ID.
 */
export const getCategoryByIdDb = async (id: string): Promise<Category | null> => {
  const doc = await db.collection("categories").doc(id).get();
  if (!doc.exists) return null;
  return doc.data() as Category;
};

/**
 * Pure Database Operation: Find active category by name.
 */
export const findCategoryByNameDb = async (
  name: string,
  excludeId?: string
): Promise<Category | null> => {
  const snapshot = await db.collection("categories").where("is_active", "==", true).get();

  const found = snapshot.docs.find((doc) => {
    if (excludeId && doc.id === excludeId) return false;
    const cat = doc.data() as Category;
    return cat.category_name.toLowerCase() === name.toLowerCase().trim();
  });

  return found ? (found.data() as Category) : null;
};

/**
 * Pure Database Operation: Insert a new category document.
 */
export const insertCategoryDb = async (category: Category): Promise<Category> => {
  await db.collection("categories").doc(category.id).set(category);
  return category;
};

/**
 * Pure Database Operation: Update an existing category document.
 */
export const updateCategoryDocDb = async (
  id: string,
  data: Partial<Category>
): Promise<Category> => {
  const updateData: Record<string, unknown> = { ...data, updated_at: new Date().toISOString() };
  Object.keys(updateData).forEach((key) => updateData[key] === undefined && delete updateData[key]);

  await db.collection("categories").doc(id).update(updateData);
  const doc = await db.collection("categories").doc(id).get();
  return doc.data() as Category;
};

/**
 * Pure Database Operation: Soft-delete a category.
 */
export const deleteCategoryDb = async (id: string): Promise<void> => {
  await db.collection("categories").doc(id).update({
    is_active: false,
    deleted_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
};

/**
 * Pure Database Operation: Count active products belonging to a category.
 */
export const countProductsByCategoryDb = async (categoryId: string): Promise<number> => {
  const snapshot = await db
    .collection("products")
    .where("category_id", "==", categoryId)
    .where("is_active", "==", true)
    .get();
  return snapshot.size;
};
