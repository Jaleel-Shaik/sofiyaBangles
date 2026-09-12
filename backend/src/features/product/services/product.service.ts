import { uploadMultipleToCloudinary } from "../../../shared/utils/cloudinary-upload";
import {
  createProductModel,
  getProductsModel,
  getAdminProductsModel,
  getProductByIdModel,
  updateProductModel,
  deleteProductModel,
  restoreProductModel,
  deleteProductsByCategoryModel,
  deleteFavoritesByProductModel,
  deleteFavoritesByProductsModel,
  deleteReviewsByProductModel,
  nullifyNotificationProductRef,
  searchProductsModel,
  getRecommendedProductsModel,
  getNewArrivalsModel,
  generateNextProductCodeModel,
} from "../models/product.model";
import { getModelTypeByIdModel } from "../../model-type/models/modelType.model";
import { getCategoryByIdModel } from "../../category/models/category.model";
import { v4 as uuidv4 } from "uuid";
import { Product, ProductImage, ProductVariant } from "../../../shared/types";
import { createAuditLogModel } from "../../../shared/models/audit.model";
import { CreateProductInput, UpdateProductInput } from "../validations/product.validation";
import { v2 as cloudinary } from "cloudinary";
import "multer"; // Fix for ts-node Express.Multer resolution

export const createProductService = async (
  input: CreateProductInput,
  files: Express.Multer.File[] | undefined,
  actorId: string,
  actorRole?: 'admin' | 'super_admin',
) => {
  // ── CENTRAL INTEGRITY RULE ─────────────────────────────────────
  // 1. Validate model_type exists
  const mtDoc = await getModelTypeByIdModel(input.model_type_id);
  if (!mtDoc) {
    throw new Error("MODEL_TYPE_NOT_FOUND");
  }

  // 2. Validate category exists and is active
  const catDoc = await getCategoryByIdModel(input.category_id);
  if (!catDoc || catDoc.is_active === false) {
    throw new Error("CATEGORY_NOT_FOUND");
  }

  // 3. Validate category belongs to the selected model
  if (catDoc.model_type_id !== input.model_type_id) {
    throw new Error("INVALID_MODEL_CATEGORY_RELATIONSHIP");
  }
  // ────────────────────────────────────────────────────────────────

  let allImageUrls: string[] = [];
  
  if (input.images && Array.isArray(input.images)) {
    allImageUrls.push(...input.images.map((img: any) => typeof img === 'string' ? img : img.image_url).filter(Boolean));
  }

  if (files && files.length > 0) {
    const uploadedUrls = await uploadMultipleToCloudinary(files);
    allImageUrls.push(...uploadedUrls);
  }

  let generatedCode = input.unique_code;
  if (!generatedCode) {
    generatedCode = await generateNextProductCodeModel(input.model_type_id, mtDoc.name || "PRD");
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
    input.variants.forEach((v: any) => {
      variants.push({
        id: uuidv4(),
        product_id: newId,
        size: v.size,
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

  const product = await createProductModel(productData, variants, images);

  // Audit log
  await createAuditLogModel({
    actor_id: actorId,
    action: "PRODUCT_CREATED",
    table_name: "products",
    record_id: product.id,
    new_data: { product_name: product.product_name, price: product.price, created_by_role: actorRole || 'admin' },
  });

  return product;
};

export const getProductsService = async (options: {
  page?: number;
  limit?: number;
  categoryId?: string;
  search?: string;
  userId?: string;
}) => {
  const page = Math.max(1, Math.floor(Number(options.page) || 1));
  const limit = Math.max(1, Math.min(100, Math.floor(Number(options.limit) || 20)));

  return getProductsModel({
    page,
    limit,
    categoryId: options.categoryId,
    search: options.search,
    userId: options.userId,
  });
};

export const getAdminProductsService = async (options: {
  page?: number;
  limit?: number;
}) => {
  const page = Math.max(1, Math.floor(Number(options.page) || 1));
  const limit = Math.max(1, Math.min(100, Math.floor(Number(options.limit) || 20)));

  return getAdminProductsModel({ page, limit });
};

export const getProductByIdService = async (id: string, userId?: string) => {
  const product = await getProductByIdModel(id, userId);
  if (!product) {
    throw new Error("PRODUCT_NOT_FOUND");
  }
  return product;
};

/**
 * Extract Cloudinary public IDs from secure URLs so we can delete them.
 * Cloudinary URLs look like: https://res.cloudinary.com/.../v1234/sofiya_bangles/products/abc123.jpg
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
 * Delete images from Cloudinary. Non-blocking — logs errors instead of throwing.
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

export const updateProductService = async (
  id: string,
  input: UpdateProductInput & { existing_images?: string | string[] },
  files: Express.Multer.File[] | undefined,
  actorId: string,
) => {
  // Verify product exists
  const existing = await getProductByIdModel(id);
  if (!existing) {
    throw new Error("PRODUCT_NOT_FOUND");
  }

  // ── CENTRAL INTEGRITY RULE (UPDATE) ──────────────────────────
  const targetCategoryId = input.category_id || existing.category_id;
  const targetModelTypeId = input.model_type_id || existing.model_type_id;

  if (targetCategoryId && targetModelTypeId) {
    const catDoc = await getCategoryByIdModel(targetCategoryId);
    if (!catDoc || catDoc.is_active === false) {
      throw new Error("CATEGORY_NOT_FOUND");
    }
    if (catDoc.model_type_id !== targetModelTypeId) {
      throw new Error("INVALID_MODEL_CATEGORY_RELATIONSHIP");
    }
  }
  // ────────────────────────────────────────────────────────────────

  let imageUrls: string[] | undefined;
  if (files && files.length > 0) {
    imageUrls = await uploadMultipleToCloudinary(files);
  }

  const existingImagesUrls: string[] = (existing.images || []).map((img: any) => typeof img === 'string' ? img : img.image_url);

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
  
  const formattedImages = mergedImages.map((url, idx) => ({
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

  const updateData: any = { ...restInput, updated_at: new Date().toISOString() };
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
    if (variants && variants.length > 0) {
      variants.forEach((v: any) => {
        formattedVariants!.push({
          id: uuidv4(),
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

  const product = await updateProductModel(id, {
    ...productFields,
    updated_by: actorId,
  }, formattedVariants, images !== undefined ? formattedImages : undefined);

  // Identify old images that were replaced (non-blocking cleanup)
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

  // Audit log
  await createAuditLogModel({
    actor_id: actorId,
    action: "PRODUCT_UPDATED",
    table_name: "products",
    record_id: id,
    old_data: { product_name: existing.product_name, price: existing.price },
    new_data: { product_name: product.product_name, price: product.price },
  });

  return product;
};

export const updateStockService = async (
  id: string,
  quantity: number,
  actorId: string,
) => {
  const existing = await getProductByIdModel(id);
  if (!existing) {
    throw new Error("PRODUCT_NOT_FOUND");
  }

  const product = await updateProductModel(id, { quantity });

  // Audit log
  await createAuditLogModel({
    actor_id: actorId,
    action: "STOCK_UPDATED",
    table_name: "products",
    record_id: id,
    old_data: { quantity: existing.quantity },
    new_data: { quantity },
  });

  return product;
};

export const sellProductService = async (
  id: string,
  quantity: number,
  actorId: string,
) => {
  const existing = await getProductByIdModel(id);
  if (!existing) {
    throw new Error("PRODUCT_NOT_FOUND");
  }
  if (existing.quantity < quantity) {
    throw new Error("INSUFFICIENT_STOCK");
  }
  const newQuantity = existing.quantity - quantity;
  const product = await updateProductModel(id, { quantity: newQuantity });

  await createAuditLogModel({
    actor_id: actorId,
    action: "PRODUCT_SOLD",
    table_name: "products",
    record_id: id,
    old_data: { quantity: existing.quantity },
    new_data: { quantity: newQuantity },
  });

  return product;
};

export const deleteProductService = async (id: string, actorId: string) => {
  const existing = await getProductByIdModel(id);
  if (!existing) {
    throw new Error("PRODUCT_NOT_FOUND");
  }

  // Soft-delete the product document
  const deletedProduct = await deleteProductModel(id);
  if (!deletedProduct) {
    throw new Error("PRODUCT_NOT_FOUND");
  }

  // Cascade: delete orphaned favorite records
  deleteFavoritesByProductModel(id).catch((err) =>
    console.error("Failed to cleanup favorites (non-fatal):", err)
  );

  // Cascade: delete product reviews
  deleteReviewsByProductModel(id).catch((err) =>
    console.error("Failed to cleanup reviews (non-fatal):", err)
  );

  // Cascade: nullify notification references to this product
  nullifyNotificationProductRef(id).catch((err) =>
    console.error("Failed to cleanup notification refs (non-fatal):", err)
  );

  // Clean up Cloudinary images (non-blocking)
  const existingImagesUrls = (existing.images || []).map((img: any) => typeof img === 'string' ? img : img.image_url);
  const allImageUrls = [
    ...existingImagesUrls,
    ...(existing.image_url ? [existing.image_url] : []),
  ];
  if (allImageUrls.length > 0) {
    cleanupCloudinaryImages(allImageUrls).catch((err) =>
      console.error("Cloudinary cleanup failed (non-fatal):", err)
    );
  }

  // Audit log
  await createAuditLogModel({
    actor_id: actorId,
    action: "PRODUCT_DELETED",
    table_name: "products",
    record_id: id,
    old_data: { product_name: existing.product_name },
  });
};

export const restoreProductService = async (id: string, actorId: string) => {
  const existing = await getProductByIdModel(id);
  if (!existing) {
    throw new Error("PRODUCT_NOT_FOUND");
  }

  if (existing.is_active) {
    // Already active — idempotent
    return existing;
  }

  const product = await restoreProductModel(id);

  await createAuditLogModel({
    actor_id: actorId,
    action: "PRODUCT_RESTORED",
    table_name: "products",
    record_id: id,
    new_data: { product_name: product.product_name },
  });

  return product;
};

/**
 * Hard-delete all products linked to a given category.
 * Called when a category is deleted (cascade).
 * Also cleans up Cloudinary images for the deleted products.
 * Returns the count of products that were cascade-deleted.
 */
export const deleteProductsByCategoryService = async (
  categoryId: string,
  actorId: string,
): Promise<number> => {
  const deletedProducts = await deleteProductsByCategoryModel(categoryId);

  if (deletedProducts.length > 0) {
    // Clean up Cloudinary images (non-blocking)
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

    // Audit log for batch deletion
    await createAuditLogModel({
      actor_id: actorId,
      action: "PRODUCTS_CASCADE_DELETED",
      table_name: "products",
      record_id: `category:${categoryId}`,
      old_data: { category_id: categoryId, count: deletedProducts.length },
    });
  }

  return deletedProducts.length;
};

export const searchProductsService = async (query: string, limit?: number, userId?: string) => {
  return searchProductsModel(query, limit, userId);
};

export const getRecommendedProductsService = async (options: {
  page?: number;
  limit?: number;
  search?: string;
  userId?: string;
}) => {
  const page = options.page || 1;
  const limit = Math.min(options.limit || 20, 100);

  return getRecommendedProductsModel({
    page,
    limit,
    search: options.search,
    userId: options.userId,
  });
};

export const getNewArrivalsService = async (options: {
  daysAgo?: number;
  page?: number;
  limit?: number;
  userId?: string;
}) => {
  const page = options.page || 1;
  const limit = Math.min(options.limit || 20, 100);
  const daysAgo = options.daysAgo || 7;

  return getNewArrivalsModel({
    daysAgo,
    page,
    limit,
    userId: options.userId,
  });
};
