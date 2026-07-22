import { uploadMultipleToCloudinary } from "../../../shared/utils/cloudinary-upload";
import {
  createProductModel,
  getProductsModel,
  getProductByIdModel,
  updateProductModel,
  deleteProductModel,
  searchProductsModel,
  getRecommendedProductsModel,
  getNewArrivalsModel
} from "../models/product.model";
import { createAuditLogModel } from "../../../shared/models/audit.model";
import { CreateProductInput, UpdateProductInput } from "../validations/product.validation";

export const createProductService = async (
  input: CreateProductInput,
  files: Express.Multer.File[] | undefined,
  actorId: string,
) => {
  let imageUrls: string[] = [];

  if (files && files.length > 0) {
    imageUrls = await uploadMultipleToCloudinary(files);
  }

  const product = await createProductModel({
    ...input,
    images: imageUrls,
    image_url: imageUrls.length > 0 ? imageUrls[0] : undefined,
  });

  // Audit log
  await createAuditLogModel({
    actor_id: actorId,
    action: "PRODUCT_CREATED",
    table_name: "products",
    record_id: product.id,
    new_data: { product_name: product.product_name, price: product.price },
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

export const getProductByIdService = async (id: string, userId?: string) => {
  const product = await getProductByIdModel(id, userId);
  if (!product) {
    throw new Error("PRODUCT_NOT_FOUND");
  }
  return product;
};

export const updateProductService = async (
  id: string,
  input: UpdateProductInput,
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

  const product = await updateProductModel(id, {
    ...input,
    ...(imageUrls && imageUrls.length > 0 && { images: imageUrls, image_url: imageUrls[0] }),
  });

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

export const deleteProductService = async (id: string, actorId: string) => {
  const existing = await getProductByIdModel(id);
  if (!existing) {
    throw new Error("PRODUCT_NOT_FOUND");
  }

  await deleteProductModel(id);

  // Audit log
  await createAuditLogModel({
    actor_id: actorId,
    action: "PRODUCT_DELETED",
    table_name: "products",
    record_id: id,
    old_data: { product_name: existing.product_name },
  });
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
