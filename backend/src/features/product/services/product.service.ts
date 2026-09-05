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
  getNewArrivalsModel
} from "../models/product.model";
import { createAuditLogModel } from "../../../shared/models/audit.model";
import { CreateProductInput, UpdateProductInput } from "../validations/product.validation";
import { v2 as cloudinary } from "cloudinary";

export const createProductService = async (
  input: CreateProductInput,
  files: Express.Multer.File[] | undefined,
  actorId: string,
  actorRole?: 'admin' | 'super_admin',
) => {
  let imageUrls: string[] = [];

  if (files && files.length > 0) {
    imageUrls = await uploadMultipleToCloudinary(files);
  }

  const images = imageUrls.map(url => ({ image_url: url }));

  const product = await createProductModel({
    ...input,
    images: images,
    created_by: actorId,
    created_by_role: actorRole || 'admin',
    updated_by: actorId,
  });

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

  let imageUrls: string[] | undefined;
  if (files && files.length > 0) {
    imageUrls = await uploadMultipleToCloudinary(files);
  }

  // Merge existing images from body (URLs of previously uploaded images)
  // and newly uploaded image URLs.
  // existing_images === '' means admin explicitly cleared all images
  // existing_images === undefined means no explicit change
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
  
  const formattedImages = mergedImages.map(url => ({ image_url: url }));

  const product = await updateProductModel(id, {
    ...restInput,
    images: formattedImages as any[],
    updated_by: actorId,
  });

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
