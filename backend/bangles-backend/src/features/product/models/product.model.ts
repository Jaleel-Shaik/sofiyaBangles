import { db } from "../../../shared/config/firebase";
import { Product, UserSizePreference } from "../../../shared/types";
import { v4 as uuidv4 } from 'uuid';
import { getSizePreferencesModel } from "../../size-preference/models/sizePreference.model";

const applySizeFilter = (p: Product, prefs: UserSizePreference[]) => {
  if (!p.category_id) return true;
  const pref = prefs.find(pr => pr.category_id === p.category_id);
  if (!pref) return true;

  if (pref.is_custom) {
    return p.accepts_custom_size === true;
  } else {
    if (p.has_variants) {
      if (!p.variants || p.variants.length === 0) return false;
      return p.variants.some(v => v.size === pref.standard_size && v.quantity > 0);
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
  image_url?: string;
  images?: string[];
  category_id?: string;
  quantity?: number;
  likes?: number;
  rating?: number;
  reviews?: number;
  has_variants?: boolean;
  variants?: any[]; // ProductVariant[]
  accepts_custom_size?: boolean;
  custom_size_price?: number | string;
}): Promise<Product> => {
  const newId = uuidv4();
  let generatedCode = payload.unique_code;

  if (!generatedCode && payload.category_id) {
    const catDoc = await db.collection("categories").doc(payload.category_id).get();
    let catName = "PRD";
    if (catDoc.exists) {
      catName = catDoc.data()?.category_name || "PRD";
    }
    const prefix = catName.substring(0, 3).toUpperCase();
    
    const counterRef = db.collection("counters").doc(`category_${payload.category_id}`);
    
    generatedCode = await db.runTransaction(async (t) => {
      const doc = await t.get(counterRef);
      let nextSeq = 1001;
      if (doc.exists) {
        const data = doc.data();
        if (data && typeof data.sequence === 'number') {
          nextSeq = data.sequence + 1;
        }
      }
      t.set(counterRef, { sequence: nextSeq }, { merge: true });
      return `${prefix}-${nextSeq}`;
    });
  }

  const productData: Product = {
    id: newId,
    unique_code: generatedCode || `PRD-${Date.now().toString().slice(-4)}`,
    product_name: payload.product_name,
    description: payload.description || null,
    price: payload.price,
    image_url: payload.image_url || null,
    images: payload.images || [],
    category_id: payload.category_id || null,
    quantity: payload.quantity || 0,
    likes: payload.likes || 0,
    rating: payload.rating || 0,
    reviews: payload.reviews || 0,
    is_active: true,
    has_variants: payload.has_variants || false,
    variants: payload.variants || [],
    accepts_custom_size: payload.accepts_custom_size || false,
    custom_size_price: payload.custom_size_price || payload.price,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  await db.collection("products").doc(newId).set(productData);
  return productData;
};

export const getProductsModel = async (options: {
  page: number;
  limit: number;
  categoryId?: string;
  search?: string;
  userId?: string;
}): Promise<{ products: Product[]; total: number }> => {
  const { page, limit, categoryId, search, userId } = options;
  
  let query: FirebaseFirestore.Query = db.collection("products").where("is_active", "==", true);

  if (categoryId) {
    query = query.where("category_id", "==", categoryId);
  }

  const snapshot = await query.get();
  let allProducts = snapshot.docs.map(doc => doc.data() as Product);

  let sizePreferences: UserSizePreference[] = [];
  if (userId) {
    sizePreferences = await getSizePreferencesModel(userId);
  }

  if (sizePreferences.length > 0) {
    allProducts = allProducts.filter(p => applySizeFilter(p, sizePreferences));
  }

  // Sort locally by created_at descending
  allProducts.sort((a, b) => {
    const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
    const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
    return dateB - dateA;
  });

  if (search) {
    const lowerSearch = search.toLowerCase();
    allProducts = allProducts.filter(p => 
      (p.product_name && p.product_name.toLowerCase().includes(lowerSearch)) ||
      (p.description && p.description.toLowerCase().includes(lowerSearch))
    );
  }

  const total = allProducts.length;
  const offset = (page - 1) * limit;
  const paginatedProducts = allProducts.slice(offset, offset + limit);

  // Fetch categories and favorites concurrently for the paginated products
  const productsWithDetails = await Promise.all(paginatedProducts.map(async (p) => {
    let category_name = undefined;
    if (p.category_id) {
      const catDoc = await db.collection("categories").doc(p.category_id).get();
      if (catDoc.exists) {
        category_name = catDoc.data()?.category_name;
      }
    }

    let is_favorited = false;
    if (userId) {
      const favSnapshot = await db.collection("favorites")
        .where("user_id", "==", userId)
        .where("product_id", "==", p.id)
        .limit(1)
        .get();
      is_favorited = !favSnapshot.empty;
    }

    return { ...p, category_name, is_favorited };
  }));

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
  if (product.category_id) {
    const catDoc = await db.collection("categories").doc(product.category_id).get();
    if (catDoc.exists) {
      category_name = catDoc.data()?.category_name;
    }
  }

  let is_favorited = false;
  if (userId) {
    const favSnapshot = await db.collection("favorites")
      .where("user_id", "==", userId)
      .where("product_id", "==", id)
      .limit(1)
      .get();
    is_favorited = !favSnapshot.empty;
  }

  return { ...product, category_name, is_favorited };
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
    quantity: number;
    likes: number;
    rating: number;
    reviews: number;
    is_active: boolean;
    has_variants: boolean;
    variants: any[];
    accepts_custom_size: boolean;
    custom_size_price: number | string;
  }>,
): Promise<Product> => {
  const updateData: any = { ...data, updated_at: new Date().toISOString() };
  Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);

  await db.collection("products").doc(id).update(updateData);
  
  const doc = await db.collection("products").doc(id).get();
  return doc.data() as Product;
};

export const deleteProductModel = async (id: string): Promise<void> => {
  await db.collection("products").doc(id).update({
    is_active: false,
    updated_at: new Date().toISOString()
  });
};

export const searchProductsModel = async (
  queryText: string,
  limit: number = 20,
  userId?: string,
): Promise<Product[]> => {
  const snapshot = await db.collection("products")
    .where("is_active", "==", true)
    .get();

  const lowerQuery = queryText.toLowerCase();
  let allProducts = snapshot.docs.map(doc => doc.data() as Product);
  
  let sizePreferences: UserSizePreference[] = [];
  if (userId) {
    sizePreferences = await getSizePreferencesModel(userId);
  }

  if (sizePreferences.length > 0) {
    allProducts = allProducts.filter(p => applySizeFilter(p, sizePreferences));
  }

  // Sort locally by created_at descending
  allProducts.sort((a, b) => {
    const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
    const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
    return dateB - dateA;
  });
  
  const filtered = allProducts.filter(p => 
    (p.product_name && p.product_name.toLowerCase().includes(lowerQuery)) ||
    (p.description && p.description.toLowerCase().includes(lowerQuery))
  ).slice(0, limit);

  const productsWithDetails = await Promise.all(filtered.map(async (p) => {
    let category_name = undefined;
    if (p.category_id) {
      const catDoc = await db.collection("categories").doc(p.category_id).get();
      if (catDoc.exists) {
        category_name = catDoc.data()?.category_name;
      }
    }
    return { ...p, category_name };
  }));

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
    userId: options.userId
  });
};

export const getNewArrivalsModel = async (options: {
  daysAgo: number;
  page: number;
  limit: number;
  userId?: string;
}): Promise<{ products: Product[]; total: number }> => {
  const { daysAgo, page, limit, userId } = options;
  
  const snapshot = await db.collection("products").where("is_active", "==", true).get();
  let allProducts = snapshot.docs.map(doc => doc.data() as Product);

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysAgo);
  const cutoffTime = cutoffDate.getTime();

  allProducts = allProducts.filter(p => {
    if (!p.created_at) return false;
    return new Date(p.created_at).getTime() >= cutoffTime;
  });

  let sizePreferences: UserSizePreference[] = [];
  if (userId) {
    sizePreferences = await getSizePreferencesModel(userId);
  }

  if (sizePreferences.length > 0) {
    allProducts = allProducts.filter(p => applySizeFilter(p, sizePreferences));
  }

  allProducts.sort((a, b) => {
    const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
    const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
    return dateB - dateA;
  });

  const total = allProducts.length;
  const offset = (page - 1) * limit;
  const paginatedProducts = allProducts.slice(offset, offset + limit);

  const productsWithDetails = await Promise.all(paginatedProducts.map(async (p) => {
    let category_name = undefined;
    if (p.category_id) {
      const catDoc = await db.collection("categories").doc(p.category_id).get();
      if (catDoc.exists) {
        category_name = catDoc.data()?.category_name;
      }
    }
    
    let is_favorited = false;
    if (userId) {
      const favSnapshot = await db.collection("favorites")
        .where("user_id", "==", userId)
        .where("product_id", "==", p.id)
        .limit(1)
        .get();
      is_favorited = !favSnapshot.empty;
    }

    return { ...p, category_name, is_favorited };
  }));

  return { products: productsWithDetails, total };
};
