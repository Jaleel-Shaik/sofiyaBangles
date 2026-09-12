import { db } from "../shared/config/firebase";
import { Product, ProductVariant, ProductImage } from "../shared/types";

/**
 * Pure Database Operation: Generates next sequential product code using an atomic Firestore transaction.
 */
export const generateNextProductSequenceDb = async (
  modelTypeId: string,
  modelTypeName: string
): Promise<string> => {
  const prefix = modelTypeName.substring(0, 3).toUpperCase();
  const counterRef = db.collection("counters").doc(`model_${modelTypeId}`);

  return await db.runTransaction(async (t) => {
    const doc = await t.get(counterRef);
    let nextSeq = 1001;
    if (doc.exists) {
      const data = doc.data();
      if (data && typeof data.sequence === "number") {
        nextSeq = data.sequence + 1;
      }
    }
    t.set(counterRef, { sequence: nextSeq }, { merge: true });
    return `${prefix}-${nextSeq}`;
  });
};

/**
 * Pure Database Operation: Batch inserts product, variants, and images.
 */
export const insertProductWithRelationsDb = async (
  product: Product,
  variants: ProductVariant[],
  images: ProductImage[]
): Promise<Product> => {
  const batch = db.batch();
  batch.set(db.collection("products").doc(product.id), product);

  variants.forEach((v) => {
    batch.set(db.collection("product_variants").doc(v.id), v);
  });

  images.forEach((img) => {
    batch.set(db.collection("product_images").doc(img.id), img);
  });

  await batch.commit();
  return { ...product, variants, images };
};

/**
 * Pure Database Operation: Retrieve a single product by ID.
 */
export const getProductByIdDb = async (id: string): Promise<Product | null> => {
  const doc = await db.collection("products").doc(id).get();
  if (!doc.exists) return null;
  return doc.data() as Product;
};

/**
 * Pure Database Operation: Retrieve all active product documents.
 */
export const getActiveProductsDb = async (categoryId?: string): Promise<Product[]> => {
  let query: FirebaseFirestore.Query = db
    .collection("products")
    .where("is_active", "==", true);

  if (categoryId) {
    query = query.where("category_id", "==", categoryId);
  }

  const snapshot = await query.get();
  return snapshot.docs.map((doc) => doc.data() as Product);
};

/**
 * Pure Database Operation: Retrieve all product documents for admin.
 */
export const getAllAdminProductsDb = async (): Promise<Product[]> => {
  const snapshot = await db.collection("products").orderBy("created_at", "desc").get();
  return snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id } as Product));
};

/**
 * Pure Database Operation: Batch update product document with variants and images.
 */
export const updateProductWithRelationsDb = async (
  id: string,
  productFields: Partial<Product>,
  variants?: ProductVariant[],
  images?: ProductImage[]
): Promise<Product | null> => {
  const batch = db.batch();
  batch.update(db.collection("products").doc(id), productFields);

  // Re-sync variants if supplied
  if (variants !== undefined) {
    const existingVariantsSnap = await db
      .collection("product_variants")
      .where("product_id", "==", id)
      .get();
    existingVariantsSnap.docs.forEach((doc) => batch.delete(doc.ref));

    if (variants.length > 0) {
      variants.forEach((v) => {
        batch.set(db.collection("product_variants").doc(v.id), v);
      });
    }
  }

  // Re-sync images if supplied
  if (images !== undefined) {
    const existingImagesSnap = await db
      .collection("product_images")
      .where("product_id", "==", id)
      .get();
    existingImagesSnap.docs.forEach((doc) => batch.delete(doc.ref));

    if (images.length > 0) {
      images.forEach((img) => {
        batch.set(db.collection("product_images").doc(img.id), img);
      });
    }
  }

  await batch.commit();
  return await getProductByIdDb(id);
};

/**
 * Pure Database Operation: Update product fields only.
 */
export const updateProductDocDb = async (
  id: string,
  data: Partial<Product>
): Promise<Product | null> => {
  await db.collection("products").doc(id).update({
    ...data,
    updated_at: new Date().toISOString(),
  });
  return await getProductByIdDb(id);
};

/**
 * Pure Database Operation: Soft-deletes a product.
 */
export const softDeleteProductDb = async (id: string): Promise<Product | null> => {
  const doc = await db.collection("products").doc(id).get();
  if (!doc.exists) return null;

  const product = doc.data() as Product;
  await db.collection("products").doc(id).update({
    is_active: false,
    status: "archived",
    deleted_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  return product;
};

/**
 * Pure Database Operation: Restores an archived product.
 */
export const restoreProductDb = async (id: string): Promise<Product | null> => {
  await db.collection("products").doc(id).update({
    is_active: true,
    status: "active",
    deleted_at: null,
    updated_at: new Date().toISOString(),
  });
  return await getProductByIdDb(id);
};

/**
 * Pure Database Operation: Batch delete all products belonging to a category.
 */
export const deleteProductsByCategoryBatchDb = async (categoryId: string): Promise<Product[]> => {
  const snapshot = await db
    .collection("products")
    .where("category_id", "==", categoryId)
    .where("is_active", "==", true)
    .get();

  if (snapshot.empty) return [];

  const deletedProducts: Product[] = [];
  const batch = db.batch();

  snapshot.docs.forEach((doc) => {
    const product = { ...doc.data(), id: doc.id } as Product;
    deletedProducts.push(product);
    batch.delete(doc.ref);
  });
  await batch.commit();

  return deletedProducts;
};

/**
 * Pure Database Operation: Get variants for a product.
 */
export const getVariantsByProductDb = async (productId: string): Promise<ProductVariant[]> => {
  const snapshot = await db
    .collection("product_variants")
    .where("product_id", "==", productId)
    .get();

  const variants = snapshot.docs.map((doc) => doc.data() as ProductVariant);
  return variants.filter((v) => v.status === "active" || v.status === "out_of_stock");
};

/**
 * Pure Database Operation: Get images for a product.
 */
export const getImagesByProductDb = async (productId: string): Promise<ProductImage[]> => {
  const snapshot = await db
    .collection("product_images")
    .where("product_id", "==", productId)
    .get();

  const images = snapshot.docs.map((doc) => doc.data() as ProductImage);
  return images.sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
};

/**
 * Pure Database Operation: Delete favorites by product ID.
 */
export const deleteFavoritesByProductDb = async (productId: string): Promise<number> => {
  const snapshot = await db
    .collection("favorites")
    .where("product_id", "==", productId)
    .get();

  if (snapshot.empty) return 0;
  const batch = db.batch();
  snapshot.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
  return snapshot.size;
};

/**
 * Pure Database Operation: Batch delete favorites for multiple product IDs.
 */
export const deleteFavoritesByProductsDb = async (productIds: string[]): Promise<number> => {
  let totalDeleted = 0;
  for (const pid of productIds) {
    totalDeleted += await deleteFavoritesByProductDb(pid);
  }
  return totalDeleted;
};

/**
 * Pure Database Operation: Delete reviews by product ID.
 */
export const deleteReviewsByProductDb = async (productId: string): Promise<number> => {
  const snapshot = await db
    .collection("product_reviews")
    .where("product_id", "==", productId)
    .get();

  if (snapshot.empty) return 0;
  const batch = db.batch();
  snapshot.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
  return snapshot.size;
};

/**
 * Pure Database Operation: Batch delete reviews for multiple product IDs.
 */
export const deleteReviewsByProductsDb = async (productIds: string[]): Promise<number> => {
  let totalDeleted = 0;
  for (const pid of productIds) {
    totalDeleted += await deleteReviewsByProductDb(pid);
  }
  return totalDeleted;
};

/**
 * Pure Database Operation: Nullify notification product references.
 */
export const nullifyNotificationProductRefDb = async (productId: string): Promise<number> => {
  const snapshot = await db
    .collection("notifications")
    .where("product_id", "==", productId)
    .get();

  if (snapshot.empty) return 0;
  const batch = db.batch();
  snapshot.docs.forEach((doc) => batch.update(doc.ref, { product_id: null }));
  await batch.commit();
  return snapshot.size;
};

/**
 * Pure Database Operation: Batch nullify notification product references.
 */
export const nullifyNotificationsByProductsDb = async (productIds: string[]): Promise<number> => {
  let totalUpdated = 0;
  for (const pid of productIds) {
    totalUpdated += await nullifyNotificationProductRefDb(pid);
  }
  return totalUpdated;
};
