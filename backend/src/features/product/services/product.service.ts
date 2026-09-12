import { uploadMultipleToCloudinary } from "../../../shared/utils/cloudinary-upload";
import {
  generateNextProductSequenceDb,
  insertProductWithRelationsDb,
  getProductByIdDb,
  getActiveProductsDb,
  getAllAdminProductsDb,
  updateProductWithRelationsDb,
  updateProductDocDb,
  softDeleteProductDb,
  restoreProductDb,
  deleteProductsByCategoryBatchDb,
  getVariantsByProductDb,
  getImagesByProductDb,
  deleteFavoritesByProductDb,
  deleteReviewsByProductDb,
  nullifyNotificationProductRefDb,
} from "../../../db/product.db";
import { getCategoryByIdDb, getCategoriesDb } from "../../../db/category.db";
import { getModelTypeByIdDb } from "../../../db/modelType.db";
import { isFavoritedDb } from "../../../db/favorite.db";
import { getSizePreferencesDb } from "../../../db/sizePreference.db";
import { insertAuditLogDb } from "../../../db/audit.db";
import { v4 as uuidv4 } from "uuid";
import { Product, ProductImage, ProductVariant } from "../../../models/product.model";
import { UserSizePreference } from "../../../models/sizePreference.model";
import { CreateProductInput, UpdateProductInput } from "../validations/product.validation";
import { v2 as cloudinary } from "cloudinary";
import "multer"; // Fix for ts-node Express.Multer resolution

interface ImageInput {
  image_url?: string;
  [key: string]: unknown;
}

interface VariantInput {
  size?: string;
  sku?: string | null;
  price: number | string;
  quantity?: number | string;
  [key: string]: unknown;
}

/**
 * Domain filter for user size preferences.
 */
const applySizeFilter = (p: Product, prefs: UserSizePreference[]): boolean => {
  if (!p.category_id) return true;
  const pref = prefs.find((pr) => pr.category_id === p.category_id);
  if (!pref) return true;

  if (pref.is_custom) {
    return p.accepts_custom_size === true;
  } else {
    if (p.has_variants) {
      if (!p.variants || p.variants.length === 0) return false;
      return p.variants.some(
        (v) => v.size === pref.standard_size && v.quantity > 0
      );
    } else {
      return true;
    }
  }
};

/**
 * Service: Create a new product with relations (variants, images)
 */
export const createProductService = async (
  input: CreateProductInput,
  files: Express.Multer.File[] | undefined,
  actorId: string,
  actorRole?: 'admin' | 'super_admin',
) => {
  // 1. Validate model_type exists
  const mtDoc = await getModelTypeByIdDb(input.model_type_id);
  if (!mtDoc) {
    throw new Error("MODEL_TYPE_NOT_FOUND");
  }

  // 2. Validate category exists and is active
  const catDoc = await getCategoryByIdDb(input.category_id);
  if (!catDoc || catDoc.is_active === false) {
    throw new Error("CATEGORY_NOT_FOUND");
  }

  // 3. Validate category belongs to the selected model
  if (catDoc.model_type_id !== input.model_type_id) {
    throw new Error("INVALID_MODEL_CATEGORY_RELATIONSHIP");
  }

  let allImageUrls: string[] = [];
  
  if (input.images && Array.isArray(input.images)) {
    allImageUrls.push(...(input.images as (string | ImageInput)[]).map((img) => typeof img === 'string' ? img : (img.image_url || '')).filter(Boolean));
  }

  if (files && files.length > 0) {
    const uploadedUrls = await uploadMultipleToCloudinary(files);
    allImageUrls.push(...uploadedUrls);
  }

  let generatedCode = input.unique_code;
  if (!generatedCode) {
    generatedCode = await generateNextProductSequenceDb(input.model_type_id, mtDoc.name || "PRD");
  }

  const newId = uuidv4();
  const status = input.status || (input.is_active !== false ? "active" : "draft");
  const is_active = status === "active" || status === "out_of_stock";

  const productData: Product = {
    id: newId,
    unique_code: generatedCode || `PRD-${Date.now().toString().slice(-4)}`,
    product_name: input.product_name,
    description: input.description || null,
    price: input.price,
    image_url: allImageUrls.length > 0 ? allImageUrls[0] : null,
    category_id: input.category_id,
    model_type_id: input.model_type_id,
    quantity: input.quantity || 0,
    likes: input.likes || 0,
    rating: input.rating || 0,
    reviews: input.reviews || 0,
    is_active,
    status,
    deleted_at: null,
    has_variants: input.has_variants || false,
    accepts_custom_size: input.accepts_custom_size || false,
    custom_size_price: input.custom_size_price ? Number(input.custom_size_price) : input.price,
    created_by: actorId,
    created_by_role: actorRole || 'admin',
    updated_by: actorId,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const variants: ProductVariant[] = [];
  if (input.has_variants && input.variants) {
    (input.variants as VariantInput[]).forEach((v) => {
      variants.push({
        id: uuidv4(),
        product_id: newId,
        size: v.size || '',
        sku: v.sku || null,
        price: Number(v.price),
        quantity: Number(v.quantity || 0),
        status: 'active',
        created_at: productData.created_at,
        updated_at: productData.updated_at,
      });
    });
  }

  const images: ProductImage[] = [];
  if (allImageUrls.length > 0) {
    allImageUrls.forEach((url, idx) => {
      images.push({
        id: uuidv4(),
        product_id: newId,
        image_url: url,
        public_id: null,
        alt_text: null,
        display_order: idx,
        is_primary: idx === 0,
        created_at: productData.created_at,
        updated_at: productData.updated_at,
      });
    });
  }

  const product = await insertProductWithRelationsDb(productData, variants, images);

  // Audit log
  await insertAuditLogDb({
    actor_id: actorId,
    action: "PRODUCT_CREATED",
    table_name: "products",
    record_id: product.id,
    new_data: { product_name: product.product_name, price: product.price, created_by_role: actorRole || 'admin' },
  });

  return product;
};

/**
 * Service: Query active products with size filtering, search, pagination, and category enrichment.
 */
export const getProductsService = async (options: {
  page?: number;
  limit?: number;
  categoryId?: string;
  search?: string;
  userId?: string;
}): Promise<{ products: Product[]; total: number }> => {
  const page = Math.max(1, Math.floor(Number(options.page) || 1));
  const limit = Math.max(1, Math.min(100, Math.floor(Number(options.limit) || 20)));

  let allProducts = await getActiveProductsDb(options.categoryId);

  let sizePreferences: UserSizePreference[] = [];
  if (options.userId) {
    sizePreferences = await getSizePreferencesDb(options.userId);
  }

  if (sizePreferences.length > 0) {
    allProducts = allProducts.filter((p) => applySizeFilter(p, sizePreferences));
  }

  allProducts.sort((a, b) => {
    const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
    const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
    return dateB - dateA;
  });

  if (options.search) {
    const lowerSearch = options.search.toLowerCase();
    allProducts = allProducts.filter(
      (p) =>
        (p.product_name && p.product_name.toLowerCase().includes(lowerSearch)) ||
        (p.description && p.description.toLowerCase().includes(lowerSearch))
    );
  }

  const total = allProducts.length;
  const offset = (page - 1) * limit;
  const paginatedProducts = allProducts.slice(offset, offset + limit);

  const categories = await getCategoriesDb();
  const categoryMap = new Map(categories.map((c) => [c.id, c.category_name]));

  const productsWithDetails = await Promise.all(
    paginatedProducts.map(async (p) => {
      const category_name = p.category_id ? categoryMap.get(p.category_id) : undefined;
      const is_favorited = options.userId ? await isFavoritedDb(options.userId, p.id) : false;
      const variants = await getVariantsByProductDb(p.id);
      const images = await getImagesByProductDb(p.id);

      return { ...p, category_name, is_favorited, variants, images };
    })
  );

  return { products: productsWithDetails, total };
};

/**
 * Service: Query products for Admin dashboard with variants and images.
 */
export const getAdminProductsService = async (options: {
  page?: number;
  limit?: number;
}): Promise<{ products: Product[]; total: number }> => {
  const page = Math.max(1, Math.floor(Number(options.page) || 1));
  const limit = Math.max(1, Math.min(100, Math.floor(Number(options.limit) || 20)));

  let allProducts = await getAllAdminProductsDb();
  allProducts = allProducts.filter((p) => p.is_active !== false);

  const total = allProducts.length;
  const offset = (page - 1) * limit;
  const products = allProducts.slice(offset, offset + limit);

  const productsWithDetails = await Promise.all(
    products.map(async (p) => {
      const variants = await getVariantsByProductDb(p.id);
      const images = await getImagesByProductDb(p.id);
      return { ...p, variants, images };
    })
  );

  return { products: productsWithDetails, total };
};

/**
 * Service: Get single product by ID with full details.
 */
export const getProductByIdService = async (id: string, userId?: string): Promise<Product> => {
  const product = await getProductByIdDb(id);
  if (!product) {
    throw new Error("PRODUCT_NOT_FOUND");
  }

  let category_name = undefined;
  let model_type_id = product.model_type_id;

  const categories = await getCategoriesDb();
  const cat = categories.find((c) => c.id === product.category_id);
  if (cat) {
    category_name = cat.category_name;
    if (!model_type_id) {
      model_type_id = cat.model_type_id;
    }
  }

  const is_favorited = userId ? await isFavoritedDb(userId, id) : false;
  const variants = await getVariantsByProductDb(id);
  const images = await getImagesByProductDb(id);

  return {
    ...product,
    category_name,
    model_type_id: model_type_id || "",
    is_favorited,
    variants,
    images,
  };
};

/**
 * Extract Cloudinary public IDs from secure URLs.
 */
const extractCloudinaryPublicIds = (imageUrls: string[]): string[] => {
  const publicIds: string[] = [];
  for (const url of imageUrls) {
    try {
      const parts = url.split("/");
      const filename = parts[parts.length - 1];
      const versionIndex = parts.findIndex((p) => /^v\d+$/.test(p));
      const folderParts = parts.slice(versionIndex + 1, parts.length - 1);
      const folder = folderParts.join("/");
      const publicId = filename.includes(".")
        ? `${folder}/${filename.substring(0, filename.lastIndexOf("."))}`
        : `${folder}/${filename}`;
      publicIds.push(publicId);
    } catch (e) {
      console.warn("Could not extract Cloudinary public ID from URL:", url);
    }
  }
  return publicIds;
};

/**
 * Delete images from Cloudinary. Non-blocking.
 */
const cleanupCloudinaryImages = async (imageUrls: string[]) => {
  if (!imageUrls || imageUrls.length === 0) return;
  const publicIds = extractCloudinaryPublicIds(imageUrls);
  if (publicIds.length === 0) return;

  try {
    const result = await cloudinary.api.delete_resources(publicIds);
    console.log(`Cleaned up ${publicIds.length} Cloudinary image(s):`, result);
  } catch (error) {
    console.error("Failed to clean up Cloudinary images (non-fatal):", error);
  }
};

/**
 * Service: Update product details, relations, and manage Cloudinary image lifecycles.
 */
export const updateProductService = async (
  id: string,
  input: UpdateProductInput & { existing_images?: string | string[] },
  files: Express.Multer.File[] | undefined,
  actorId: string,
) => {
  const existing = await getProductByIdDb(id);
  if (!existing) {
    throw new Error("PRODUCT_NOT_FOUND");
  }

  const targetCategoryId = input.category_id || existing.category_id;
  const targetModelTypeId = input.model_type_id || existing.model_type_id;

  if (targetCategoryId && targetModelTypeId) {
    const catDoc = await getCategoryByIdDb(targetCategoryId);
    if (!catDoc || catDoc.is_active === false) {
      throw new Error("CATEGORY_NOT_FOUND");
    }
    if (catDoc.model_type_id !== targetModelTypeId) {
      throw new Error("INVALID_MODEL_CATEGORY_RELATIONSHIP");
    }
  }

  let imageUrls: string[] | undefined;
  if (files && files.length > 0) {
    imageUrls = await uploadMultipleToCloudinary(files);
  }

  const existingImagesList = await getImagesByProductDb(id);
  const existingImagesUrls: string[] = existingImagesList.map((img) => img.image_url);

  const existingImages: string[] = input.existing_images !== undefined
    ? (Array.isArray(input.existing_images)
        ? input.existing_images.filter(Boolean)
        : input.existing_images
          ? [input.existing_images]
          : [])
    : existingImagesUrls;

  const mergedImages = imageUrls && imageUrls.length > 0
    ? [...existingImages, ...imageUrls]
    : existingImages;

  const { existing_images, ...restInput } = input;
  
  const formattedImages: ProductImage[] = mergedImages.map((url, idx) => ({
    id: uuidv4(),
    product_id: id,
    image_url: url,
    public_id: null,
    alt_text: null,
    display_order: idx,
    is_primary: idx === 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }));

  const updateData: Record<string, unknown> = { ...restInput, updated_at: new Date().toISOString() };
  if (restInput.status) {
    updateData.is_active = restInput.status === "active" || restInput.status === "out_of_stock";
  } else if (restInput.is_active !== undefined) {
    updateData.status = restInput.is_active ? "active" : "draft";
  }

  Object.keys(updateData).forEach(
    (key) => updateData[key] === undefined && delete updateData[key],
  );

  const { variants, images, image_url, ...productFields } = updateData;

  if (mergedImages.length > 0) {
    productFields.image_url = mergedImages[0];
  } else if (image_url !== undefined) {
    productFields.image_url = image_url;
  }

  let formattedVariants: ProductVariant[] | undefined = undefined;
  if (variants !== undefined) {
    formattedVariants = [];
    if (variants && Array.isArray(variants) && variants.length > 0) {
      (variants as VariantInput[]).forEach((v) => {
        formattedVariants!.push({
          id: uuidv4(),
          product_id: id,
          size: v.size || '',
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

  const product = await updateProductWithRelationsDb(id, {
    ...productFields,
    updated_by: actorId,
  }, formattedVariants, images !== undefined ? formattedImages : undefined);

  if (!product) {
    throw new Error("PRODUCT_NOT_FOUND");
  }

  if (existingImagesUrls.length > 0) {
    const removedImages = existingImagesUrls.filter(
      (imgUrl: string) => !mergedImages.includes(imgUrl)
    );
    if (removedImages.length > 0) {
      cleanupCloudinaryImages(removedImages).catch((err) =>
        console.error("Cloudinary cleanup failed (non-fatal):", err)
      );
    }
  }

  await insertAuditLogDb({
    actor_id: actorId,
    action: "PRODUCT_UPDATED",
    table_name: "products",
    record_id: id,
    old_data: { product_name: existing.product_name, price: existing.price },
    new_data: { product_name: product.product_name, price: product.price },
  });

  return product;
};

/**
 * Service: Update product inventory stock.
 */
export const updateStockService = async (
  id: string,
  quantity: number,
  actorId: string,
) => {
  const existing = await getProductByIdDb(id);
  if (!existing) {
    throw new Error("PRODUCT_NOT_FOUND");
  }

  const product = await updateProductDocDb(id, { quantity });

  await insertAuditLogDb({
    actor_id: actorId,
    action: "STOCK_UPDATED",
    table_name: "products",
    record_id: id,
    old_data: { quantity: existing.quantity },
    new_data: { quantity },
  });

  return product;
};

/**
 * Service: Deduct inventory upon sale.
 */
export const sellProductService = async (
  id: string,
  quantity: number,
  actorId: string,
) => {
  const existing = await getProductByIdDb(id);
  if (!existing) {
    throw new Error("PRODUCT_NOT_FOUND");
  }
  if (existing.quantity < quantity) {
    throw new Error("INSUFFICIENT_STOCK");
  }
  const newQuantity = existing.quantity - quantity;
  const product = await updateProductDocDb(id, { quantity: newQuantity });

  await insertAuditLogDb({
    actor_id: actorId,
    action: "PRODUCT_SOLD",
    table_name: "products",
    record_id: id,
    old_data: { quantity: existing.quantity },
    new_data: { quantity: newQuantity },
  });

  return product;
};

/**
 * Service: Soft delete product and cascade cleanups.
 */
export const deleteProductService = async (id: string, actorId: string) => {
  const existing = await getProductByIdDb(id);
  if (!existing) {
    throw new Error("PRODUCT_NOT_FOUND");
  }

  const deletedProduct = await softDeleteProductDb(id);
  if (!deletedProduct) {
    throw new Error("PRODUCT_NOT_FOUND");
  }

  deleteFavoritesByProductDb(id).catch((err) =>
    console.error("Failed to cleanup favorites (non-fatal):", err)
  );

  deleteReviewsByProductDb(id).catch((err) =>
    console.error("Failed to cleanup reviews (non-fatal):", err)
  );

  nullifyNotificationProductRefDb(id).catch((err) =>
    console.error("Failed to cleanup notification refs (non-fatal):", err)
  );

  const existingImagesList = await getImagesByProductDb(id);
  const existingImagesUrls = existingImagesList.map((img) => img.image_url);
  const allImageUrls = [
    ...existingImagesUrls,
    ...(existing.image_url ? [existing.image_url] : []),
  ];
  if (allImageUrls.length > 0) {
    cleanupCloudinaryImages(allImageUrls).catch((err) =>
      console.error("Cloudinary cleanup failed (non-fatal):", err)
    );
  }

  await insertAuditLogDb({
    actor_id: actorId,
    action: "PRODUCT_DELETED",
    table_name: "products",
    record_id: id,
    old_data: { product_name: existing.product_name },
  });
};

/**
 * Service: Restore soft-deleted product.
 */
export const restoreProductService = async (id: string, actorId: string) => {
  const existing = await getProductByIdDb(id);
  if (!existing) {
    throw new Error("PRODUCT_NOT_FOUND");
  }

  if (existing.is_active) {
    return existing;
  }

  const product = await restoreProductDb(id);
  if (!product) {
    throw new Error("PRODUCT_NOT_FOUND");
  }

  await insertAuditLogDb({
    actor_id: actorId,
    action: "PRODUCT_RESTORED",
    table_name: "products",
    record_id: id,
    new_data: { product_name: product.product_name },
  });

  return product;
};

/**
 * Service: Cascade delete products by category.
 */
export const deleteProductsByCategoryService = async (
  categoryId: string,
  actorId: string,
): Promise<number> => {
  const deletedProducts = await deleteProductsByCategoryBatchDb(categoryId);

  if (deletedProducts.length > 0) {
    const allImageUrls: string[] = [];
    for (const product of deletedProducts) {
      if (product.image_url) allImageUrls.push(product.image_url);
      if (product.images) {
        allImageUrls.push(...product.images.map((img: any) => typeof img === 'string' ? img : img.image_url));
      }
    }
    if (allImageUrls.length > 0) {
      cleanupCloudinaryImages(allImageUrls).catch((err) =>
        console.error("Cloudinary cleanup failed for cascade-deleted products (non-fatal):", err)
      );
    }

    await insertAuditLogDb({
      actor_id: actorId,
      action: "PRODUCTS_CASCADE_DELETED",
      table_name: "products",
      record_id: `category:${categoryId}`,
      old_data: { category_id: categoryId, count: deletedProducts.length },
    });
  }

  return deletedProducts.length;
};

/**
 * Service: Search products.
 */
export const searchProductsService = async (query: string, limit?: number, userId?: string) => {
  const res = await getProductsService({ page: 1, limit: limit || 20, search: query, userId });
  return res.products;
};

/**
 * Service: Recommended products.
 */
export const getRecommendedProductsService = async (options: {
  page?: number;
  limit?: number;
  search?: string;
  userId?: string;
}) => {
  return getProductsService({
    page: options.page || 1,
    limit: Math.min(options.limit || 20, 100),
    search: options.search,
    userId: options.userId,
  });
};

/**
 * Service: New arrivals.
 */
export const getNewArrivalsService = async (options: {
  daysAgo?: number;
  page?: number;
  limit?: number;
  userId?: string;
}) => {
  return getProductsService({
    page: options.page || 1,
    limit: Math.min(options.limit || 20, 100),
    userId: options.userId,
  });
};
