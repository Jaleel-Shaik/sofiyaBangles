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

export const createProductModel = async (payload: {
  unique_code?: string;
  product_name: string;
  description?: string;
  price: number;
  category_id: string;
  model_type_id: string;
  quantity?: number;
  likes?: number;
  rating?: number;
  reviews?: number;
  is_active?: boolean;
  status?: 'draft' | 'active' | 'out_of_stock' | 'archived';
  has_variants?: boolean;
  variants?: any[]; // Array of size, price, sku, quantity objects
  images?: any[]; // Array of image_url objects
  accepts_custom_size?: boolean;
  custom_size_price?: number | string;
}): Promise<Product> => {
  // ── CENTRAL INTEGRITY RULE ─────────────────────────────────────
  // 1. Validate model_type exists
  const mtDoc = await db.collection("model_types").doc(payload.model_type_id).get();
  if (!mtDoc.exists) {
    throw new Error("MODEL_TYPE_NOT_FOUND");
  }

  // 2. Validate category exists and is active
  const catDoc = await db.collection("categories").doc(payload.category_id).get();
  if (!catDoc.exists) {
    throw new Error("CATEGORY_NOT_FOUND");
  }
  const catData = catDoc.data();
  if (catData?.is_active === false) {
    throw new Error("CATEGORY_NOT_FOUND");
  }

  // 3. Validate category belongs to the selected model
  if (catData?.model_type_id !== payload.model_type_id) {
    throw new Error("INVALID_MODEL_CATEGORY_RELATIONSHIP");
  }
  // ────────────────────────────────────────────────────────────────

  const newId = uuidv4();
  let generatedCode = payload.unique_code;

  if (!generatedCode) {
    const mtName = mtDoc.data()?.name || "PRD";
    const prefix = mtName.substring(0, 3).toUpperCase();

    const counterRef = db
      .collection("counters")
      .doc(`model_${payload.model_type_id}`);

    generatedCode = await db.runTransaction(async (t) => {
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
  }

  const status = payload.status || (payload.is_active !== false ? "active" : "draft");
  const is_active = status === "active" || status === "out_of_stock";

  const productData: Product = {
    id: newId,
    unique_code: generatedCode || `PRD-${Date.now().toString().slice(-4)}`,
    product_name: payload.product_name,
    description: payload.description || null,
    price: payload.price,
    image_url: payload.images && payload.images.length > 0 ? payload.images[0].image_url : null,
    category_id: payload.category_id,
    model_type_id: payload.model_type_id,
    quantity: payload.quantity || 0,
    likes: payload.likes || 0,
    rating: payload.rating || 0,
    reviews: payload.reviews || 0,
    is_active,
    status,
    deleted_at: null,
    has_variants: payload.has_variants || false,
    accepts_custom_size: payload.accepts_custom_size || false,
    custom_size_price: payload.custom_size_price ? Number(payload.custom_size_price) : payload.price,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const batch = db.batch();
  batch.set(db.collection("products").doc(newId), productData);

  const insertedVariants: ProductVariant[] = [];
  if (payload.has_variants && payload.variants) {
    payload.variants.forEach((v) => {
      const vId = uuidv4();
      const variant: ProductVariant = {
        id: vId,
        product_id: newId,
        size: v.size,
        sku: v.sku || null,
        price: Number(v.price),
        quantity: Number(v.quantity || 0),
        status: 'active',
        created_at: productData.created_at,
        updated_at: productData.updated_at,
      };
      insertedVariants.push(variant);
      batch.set(db.collection("product_variants").doc(vId), variant);
    });
  }

  const insertedImages: ProductImage[] = [];
  if (payload.images && payload.images.length > 0) {
    payload.images.forEach((img, idx) => {
      const iId = uuidv4();
      const pImage: ProductImage = {
        id: iId,
        product_id: newId,
        image_url: img.image_url,
        public_id: img.public_id || null,
        alt_text: img.alt_text || null,
        display_order: idx,
        is_primary: idx === 0,
        created_at: productData.created_at,
        updated_at: productData.updated_at,
      };
      insertedImages.push(pImage);
      batch.set(db.collection("product_images").doc(iId), pImage);
    });
  }

  await batch.commit();

  return {
    ...productData,
    variants: insertedVariants,
    images: insertedImages
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
  data: Partial<{
    unique_code: string;
    product_name: string;
    description: string;
    price: number;
    image_url: string;
    images: string[];
    category_id: string;
    model_type_id: string;
    quantity: number;
    likes: number;
    rating: number;
    reviews: number;
    is_active: boolean;
    status: 'draft' | 'active' | 'out_of_stock' | 'archived';
    deleted_at: string | null;
    has_variants: boolean;
    variants: any[];
    accepts_custom_size: boolean;
    custom_size_price: number | string;
  }>,
): Promise<Product> => {
  const updateData: any = { ...data, updated_at: new Date().toISOString() };
  if (data.status) {
    updateData.is_active = data.status === "active" || data.status === "out_of_stock";
  } else if (data.is_active !== undefined) {
    updateData.status = data.is_active ? "active" : "draft";
  }

  Object.keys(updateData).forEach(
    (key) => updateData[key] === undefined && delete updateData[key],
  );

  const { variants, images, image_url, ...productFields } = updateData;

  const batch = db.batch();

  // ── CENTRAL INTEGRITY RULE (UPDATE) ──────────────────────────
  if (productFields.category_id || productFields.model_type_id) {
    const doc = await db.collection("products").doc(id).get();
    if (doc.exists) {
      const existingProduct = doc.data() as Product;
      const targetCategoryId = productFields.category_id || existingProduct.category_id;
      const targetModelTypeId = productFields.model_type_id || existingProduct.model_type_id;

      if (targetCategoryId && targetModelTypeId) {
        const catDoc = await db.collection("categories").doc(targetCategoryId).get();
        if (!catDoc.exists) {
           throw new Error("CATEGORY_NOT_FOUND");
        }
        const catData = catDoc.data();
        if (catData?.is_active === false) {
          throw new Error("CATEGORY_NOT_FOUND");
        }
        if (catData?.model_type_id !== targetModelTypeId) {
          throw new Error("INVALID_MODEL_CATEGORY_RELATIONSHIP");
        }
      }
    }
  }
  // ────────────────────────────────────────────────────────────────

  // Set primary image URL correctly based on images if passed
  if (images && images.length > 0) {
    productFields.image_url = images[0].image_url;
  } else if (image_url !== undefined) {
    productFields.image_url = image_url;
  }

  batch.update(db.collection("products").doc(id), productFields);

  // Re-sync variants
  if (variants !== undefined) {
    const existingVariantsSnap = await db.collection("product_variants").where("product_id", "==", id).get();
    existingVariantsSnap.docs.forEach(doc => {
       batch.delete(doc.ref);
    });
    
    if (variants && variants.length > 0) {
      variants.forEach((v: any) => {
        const vId = uuidv4();
        batch.set(db.collection("product_variants").doc(vId), {
          id: vId,
          product_id: id,
          size: v.size,
          sku: v.sku || null,
          price: Number(v.price),
          quantity: Number(v.quantity || 0),
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
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
      images.forEach((img: any, idx: number) => {
        const iId = uuidv4();
        batch.set(db.collection("product_images").doc(iId), {
          id: iId,
          product_id: id,
          image_url: img.image_url,
          public_id: img.public_id || null,
          alt_text: img.alt_text || null,
          display_order: idx,
          is_primary: idx === 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
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
