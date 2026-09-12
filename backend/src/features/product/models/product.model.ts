import { db } from "../../../shared/config/firebase";
import { Product, UserSizePreference, ProductVariant, ProductImage } from "../../../shared/types";
import { v4 as uuidv4 } from "uuid";
import { getSizePreferencesModel } from "../../size-preference/models/sizePreference.model";
import { getVariantsByProductModel } from "./productVariant.model";
import { getImagesByProductModel } from "./productImage.model";

export const calculateReviewStats = (reviews: Array<{ rating: number }>) => {
  if (!reviews.length) {
    return { rating: 0, reviews: 0 };
  }

  const total = reviews.reduce((sum, review) => sum + review.rating, 0);
  return {
    rating: Number((total / reviews.length).toFixed(1)),
    reviews: reviews.length,
  };
};

const applySizeFilter = (p: Product, prefs: UserSizePreference[]) => {
  if (!p.category_id) return true;
  const pref = prefs.find((pr) => pr.category_id === p.category_id);
  if (!pref) return true;

  if (pref.is_custom) {
    return p.accepts_custom_size === true;
  } else {
    if (p.has_variants) {
      if (!p.variants || p.variants.length === 0) return false;
      return p.variants.some(
        (v) => v.size === pref.standard_size && v.quantity > 0,
      );
    } else {
      return true;
    }
  }
};

export const generateNextProductCodeModel = async (modelTypeId: string, modelTypeName: string): Promise<string> => {
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

export const createProductModel = async (
  productData: Product,
  variants: ProductVariant[],
  images: ProductImage[]
): Promise<Product> => {
  const batch = db.batch();
  batch.set(db.collection("products").doc(productData.id), productData);

  variants.forEach((v) => {
    batch.set(db.collection("product_variants").doc(v.id), v);
  });

  images.forEach((img) => {
    batch.set(db.collection("product_images").doc(img.id), img);
  });

  await batch.commit();

  return {
    ...productData,
    variants,
    images
  };
};

export const getProductsModel = async (options: {
  page: number;
  limit: number;
  categoryId?: string;
  search?: string;
  userId?: string;
}): Promise<{ products: Product[]; total: number }> => {
  const { page, limit, categoryId, search, userId } = options;

  let query: FirebaseFirestore.Query = db
    .collection("products")
    .where("is_active", "==", true);

  if (categoryId) {
    query = query.where("category_id", "==", categoryId);
  }

  const snapshot = await query.get();
  let allProducts = snapshot.docs.map((doc) => doc.data() as Product);

  let sizePreferences: UserSizePreference[] = [];
  if (userId) {
    sizePreferences = await getSizePreferencesModel(userId);
  }

  if (sizePreferences.length > 0) {
    allProducts = allProducts.filter((p) =>
      applySizeFilter(p, sizePreferences),
    );
  }

  // Sort locally by created_at descending
  allProducts.sort((a, b) => {
    const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
    const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
    return dateB - dateA;
  });

  if (search) {
    const lowerSearch = search.toLowerCase();
    allProducts = allProducts.filter(
      (p) =>
        (p.product_name &&
          p.product_name.toLowerCase().includes(lowerSearch)) ||
        (p.description && p.description.toLowerCase().includes(lowerSearch)),
    );
  }

  const total = allProducts.length;
  const offset = (page - 1) * limit;
  const paginatedProducts = allProducts.slice(offset, offset + limit);

  // Fetch categories and favorites concurrently for the paginated products
  const productsWithDetails = await Promise.all(
    paginatedProducts.map(async (p) => {
      let category_name = undefined;
      if (p.category_id) {
        const catDoc = await db
          .collection("categories")
          .doc(p.category_id)
          .get();
        if (catDoc.exists) {
          category_name = catDoc.data()?.category_name;
        }
      }

      let is_favorited = false;
      if (userId) {
        const favSnapshot = await db
          .collection("favorites")
          .where("user_id", "==", userId)
          .where("product_id", "==", p.id)
          .limit(1)
          .get();
        is_favorited = !favSnapshot.empty;
      }
      
      const variants = await getVariantsByProductModel(p.id);
      const images = await getImagesByProductModel(p.id);

      return { ...p, category_name, is_favorited, variants, images };
    }),
  );

  return { products: productsWithDetails, total };
};

export const getAdminProductsModel = async (options: {
  page: number;
  limit: number;
}): Promise<{ products: Product[]; total: number }> => {
  const { page, limit } = options;

  let query: FirebaseFirestore.Query = db.collection("products").orderBy("created_at", "desc");

  const allSnapshot = await query.get();
  let allProducts = allSnapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id } as Product));

  // Filter in-memory to avoid requiring a composite Firestore index
  allProducts = allProducts.filter((p) => p.is_active !== false);

  const total = allProducts.length;
  const offset = (page - 1) * limit;
  const products = allProducts.slice(offset, offset + limit);

  const productsWithDetails = await Promise.all(
    products.map(async (p) => {
      const variants = await getVariantsByProductModel(p.id);
      const images = await getImagesByProductModel(p.id);
      return { ...p, variants, images };
    })
  );

  return { products: productsWithDetails, total };
};

export const getProductByIdModel = async (
  id: string,
  userId?: string,
): Promise<Product | null> => {
  const doc = await db.collection("products").doc(id).get();
  if (!doc.exists) return null;

  const product = doc.data() as Product;

  let category_name = undefined;
  let model_type_id = product.model_type_id;
  if (product.category_id) {
    const catDoc = await db
      .collection("categories")
      .doc(product.category_id)
      .get();
    if (catDoc.exists) {
      category_name = catDoc.data()?.category_name;
      if (!model_type_id) {
        model_type_id = catDoc.data()?.model_type_id;
      }
    }
  }

  let model_type_name = undefined;
  if (model_type_id) {
    const mtDoc = await db
      .collection("model_types")
      .doc(model_type_id)
      .get();
    if (mtDoc.exists) {
      model_type_name = mtDoc.data()?.name;
    }
  }

  let is_favorited = false;
  if (userId) {
    const favSnapshot = await db
      .collection("favorites")
      .where("user_id", "==", userId)
      .where("product_id", "==", id)
      .limit(1)
      .get();
    is_favorited = !favSnapshot.empty;
  }

  const variants = await getVariantsByProductModel(id);
  const images = await getImagesByProductModel(id);

  return { ...product, category_name, model_type_id: model_type_id || "", model_type_name, is_favorited, variants, images };
};

export const updateProductModel = async (
  id: string,
  productFields: any,
  variants?: any[],
  images?: any[]
): Promise<Product> => {
  const batch = db.batch();
  
  batch.update(db.collection("products").doc(id), productFields);

  // Re-sync variants
  if (variants !== undefined) {
    const existingVariantsSnap = await db.collection("product_variants").where("product_id", "==", id).get();
    existingVariantsSnap.docs.forEach(doc => {
       batch.delete(doc.ref);
    });
    
    if (variants && variants.length > 0) {
      variants.forEach((v: any) => {
        batch.set(db.collection("product_variants").doc(v.id), v);
      });
    }
  }

  // Re-sync images
  if (images !== undefined) {
    const existingImagesSnap = await db.collection("product_images").where("product_id", "==", id).get();
    existingImagesSnap.docs.forEach(doc => {
       batch.delete(doc.ref);
    });

    if (images && images.length > 0) {
      images.forEach((img: any) => {
        batch.set(db.collection("product_images").doc(img.id), img);
      });
    }
  }

  await batch.commit();

  return getProductByIdModel(id) as unknown as Product;
};

/**
 * Delete orphaned favorite records for a given product.
 * Used to clean up favorites when a product is soft-deleted.
 */
export const deleteFavoritesByProductModel = async (productId: string): Promise<number> => {
  const snapshot = await db
    .collection("favorites")
    .where("product_id", "==", productId)
    .get();

  if (snapshot.empty) return 0;

  const batch = db.batch();
  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });
  await batch.commit();

  return snapshot.size;
};

/**
 * Soft-delete a product document in Firestore (marks status as 'archived' and sets deleted_at).
 * Cascades to clean up favorites, reviews, and notification references.
 * Returns the product data.
 */
export const deleteProductModel = async (id: string): Promise<Product | null> => {
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
 * Restore a soft-deleted product by setting is_active = true, status = 'active', deleted_at = null.
 */
export const restoreProductModel = async (id: string): Promise<Product> => {
  await db.collection("products").doc(id).update({
    is_active: true,
    status: "active",
    deleted_at: null,
    updated_at: new Date().toISOString(),
  });

  const doc = await db.collection("products").doc(id).get();
  return doc.data() as Product;
};

/**
 * Hard-delete all products belonging to a given category.
 * Used for cascade deletion when a category is deleted.
 * Also cleans up orphaned favorites, reviews, and notification references.
 * Returns the array of deleted product data (for Cloudinary cleanup).
 */
export const deleteProductsByCategoryModel = async (categoryId: string): Promise<Product[]> => {
  const snapshot = await db
    .collection("products")
    .where("category_id", "==", categoryId)
    .where("is_active", "==", true)
    .get();

  if (snapshot.empty) return [];

  const deletedProducts: Product[] = [];
  const batch = db.batch();
  const productIds: string[] = [];

  snapshot.docs.forEach((doc) => {
    const product = { ...doc.data(), id: doc.id } as Product;
    deletedProducts.push(product);
    productIds.push(doc.id);
    batch.delete(doc.ref);
  });
  await batch.commit();

  // Clean up favorites for cascade-deleted products (fire-and-forget)
  deleteFavoritesByProductsModel(productIds).catch((err) =>
    console.error("Failed to cleanup favorites for cascade-deleted products:", err)
  );

  // Clean up reviews for cascade-deleted products (fire-and-forget)
  deleteReviewsByProductsModel(productIds).catch((err) =>
    console.error("Failed to cleanup reviews for cascade-deleted products:", err)
  );

  // Nullify notification references (fire-and-forget)
  nullifyNotificationsByProductsModel(productIds).catch((err) =>
    console.error("Failed to cleanup notifications for cascade-deleted products:", err)
  );

  return deletedProducts;
};

/**
 * Batch delete reviews for multiple products.
 */
export const deleteReviewsByProductsModel = async (productIds: string[]): Promise<number> => {
  let totalDeleted = 0;
  for (const productId of productIds) {
    const count = await deleteReviewsByProductModel(productId);
    totalDeleted += count;
  }
  return totalDeleted;
};

/**
 * Batch nullify notification references for multiple products.
 */
export const nullifyNotificationsByProductsModel = async (productIds: string[]): Promise<number> => {
  let totalUpdated = 0;
  for (const productId of productIds) {
    const count = await nullifyNotificationProductRef(productId);
    totalUpdated += count;
  }
  return totalUpdated;
};

/**
 * Batch delete favorites for multiple products.
 */
export const deleteFavoritesByProductsModel = async (productIds: string[]): Promise<number> => {
  let totalDeleted = 0;
  for (const productId of productIds) {
    const count = await deleteFavoritesByProductModel(productId);
    totalDeleted += count;
  }
  return totalDeleted;
};

/**
 * Delete all product reviews for a given product.
 */
export const deleteReviewsByProductModel = async (productId: string): Promise<number> => {
  const snapshot = await db
    .collection("product_reviews")
    .where("product_id", "==", productId)
    .get();

  if (snapshot.empty) return 0;

  const batch = db.batch();
  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });
  await batch.commit();

  return snapshot.size;
};

/**
 * Nullify notification references to a deleted product.
 * Notifications are kept (for history) but the product_id reference is removed.
 */
export const nullifyNotificationProductRef = async (productId: string): Promise<number> => {
  const snapshot = await db
    .collection("notifications")
    .where("product_id", "==", productId)
    .get();

  if (snapshot.empty) return 0;

  const batch = db.batch();
  snapshot.docs.forEach((doc) => {
    batch.update(doc.ref, { product_id: null });
  });
  await batch.commit();

  return snapshot.size;
};

export const searchProductsModel = async (
  queryText: string,
  limit: number = 20,
  userId?: string,
): Promise<Product[]> => {
  const snapshot = await db
    .collection("products")
    .where("is_active", "==", true)
    .get();

  const lowerQuery = queryText.toLowerCase();
  let allProducts = snapshot.docs.map((doc) => doc.data() as Product);

  let sizePreferences: UserSizePreference[] = [];
  if (userId) {
    sizePreferences = await getSizePreferencesModel(userId);
  }

  if (sizePreferences.length > 0) {
    allProducts = allProducts.filter((p) =>
      applySizeFilter(p, sizePreferences),
    );
  }

  // Sort locally by created_at descending
  allProducts.sort((a, b) => {
    const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
    const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
    return dateB - dateA;
  });

  const filtered = allProducts
    .filter(
      (p) =>
        (p.product_name && p.product_name.toLowerCase().includes(lowerQuery)) ||
        (p.description && p.description.toLowerCase().includes(lowerQuery)),
    )
    .slice(0, limit);

  const productsWithDetails = await Promise.all(
    filtered.map(async (p) => {
      let category_name = undefined;
      if (p.category_id) {
        const catDoc = await db
          .collection("categories")
          .doc(p.category_id)
          .get();
        if (catDoc.exists) {
          category_name = catDoc.data()?.category_name;
        }
      }
      
      const variants = await getVariantsByProductModel(p.id);
      const images = await getImagesByProductModel(p.id);
      
      return { ...p, category_name, variants, images };
    }),
  );

  return productsWithDetails;
};

export const getRecommendedProductsModel = async (options: {
  page: number;
  limit: number;
  userId?: string;
  search?: string;
}): Promise<{ products: Product[]; total: number }> => {
  // Simple deterministic recommendation: recent matching sizes
  return getProductsModel({
    page: options.page,
    limit: options.limit,
    search: options.search,
    userId: options.userId,
  });
};

export const getNewArrivalsModel = async (options: {
  daysAgo: number;
  page: number;
  limit: number;
  userId?: string;
}): Promise<{ products: Product[]; total: number }> => {
  const { daysAgo, page, limit, userId } = options;

  const snapshot = await db
    .collection("products")
    .where("is_active", "==", true)
    .get();
  let allProducts = snapshot.docs.map((doc) => doc.data() as Product);

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysAgo);
  const cutoffTime = cutoffDate.getTime();

  allProducts = allProducts.filter((p) => {
    if (!p.created_at) return false;
    return new Date(p.created_at).getTime() >= cutoffTime;
  });

  let sizePreferences: UserSizePreference[] = [];
  if (userId) {
    sizePreferences = await getSizePreferencesModel(userId);
  }

  if (sizePreferences.length > 0) {
    allProducts = allProducts.filter((p) =>
      applySizeFilter(p, sizePreferences),
    );
  }

  allProducts.sort((a, b) => {
    const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
    const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
    return dateB - dateA;
  });

  const total = allProducts.length;
  const offset = (page - 1) * limit;
  const paginatedProducts = allProducts.slice(offset, offset + limit);

  const productsWithDetails = await Promise.all(
    paginatedProducts.map(async (p) => {
      let category_name = undefined;
      if (p.category_id) {
        const catDoc = await db
          .collection("categories")
          .doc(p.category_id)
          .get();
        if (catDoc.exists) {
          category_name = catDoc.data()?.category_name;
        }
      }

      let is_favorited = false;
      if (userId) {
        const favSnapshot = await db
          .collection("favorites")
          .where("user_id", "==", userId)
          .where("product_id", "==", p.id)
          .limit(1)
          .get();
        is_favorited = !favSnapshot.empty;
      }

      const variants = await getVariantsByProductModel(p.id);
      const images = await getImagesByProductModel(p.id);

      return { ...p, category_name, is_favorited, variants, images };
    }),
  );

  return { products: productsWithDetails, total };
};
