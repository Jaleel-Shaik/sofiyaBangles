import { uploadToCloudinary } from "../utils/cloudinary-upload";
import {
  createProductRepo,
  getProductsRepo,
  getProductByIdRepo,
  updateProductRepo,
  deleteProductRepo,
  searchProductsRepo,
} from "../repositories/product.repository";
import { createAuditLogRepo } from "../repositories/audit.repository";
import { CreateProductInput, UpdateProductInput } from "../validations/product.schema";

export const createProductService = async (
  input: CreateProductInput,
  file: Express.Multer.File | undefined,
  actorId: string,
) => {
  let imageUrl: string | undefined;

  if (file) {
    imageUrl = await uploadToCloudinary(file);
  }

  const product = await createProductRepo({
    ...input,
    image_url: imageUrl,
  });

  // Audit log
  await createAuditLogRepo({
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
  const page = options.page || 1;
  const limit = Math.min(options.limit || 20, 100);

  return getProductsRepo({
    page,
    limit,
    categoryId: options.categoryId,
    search: options.search,
    userId: options.userId,
  });
};

export const getProductByIdService = async (id: string, userId?: string) => {
  const product = await getProductByIdRepo(id, userId);
  if (!product) {
    throw new Error("PRODUCT_NOT_FOUND");
  }
  return product;
};

export const updateProductService = async (
  id: string,
  input: UpdateProductInput,
  file: Express.Multer.File | undefined,
  actorId: string,
) => {
  // Verify product exists
  const existing = await getProductByIdRepo(id);
  if (!existing) {
    throw new Error("PRODUCT_NOT_FOUND");
  }

  let imageUrl: string | undefined;
  if (file) {
    imageUrl = await uploadToCloudinary(file);
  }

  const product = await updateProductRepo(id, {
    ...input,
    ...(imageUrl && { image_url: imageUrl }),
  });

  // Audit log
  await createAuditLogRepo({
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
  const existing = await getProductByIdRepo(id);
  if (!existing) {
    throw new Error("PRODUCT_NOT_FOUND");
  }

  const product = await updateProductRepo(id, { quantity });

  // Audit log
  await createAuditLogRepo({
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
  const existing = await getProductByIdRepo(id);
  if (!existing) {
    throw new Error("PRODUCT_NOT_FOUND");
  }

  await deleteProductRepo(id);

  // Audit log
  await createAuditLogRepo({
    actor_id: actorId,
    action: "PRODUCT_DELETED",
    table_name: "products",
    record_id: id,
    old_data: { product_name: existing.product_name },
  });
};

export const searchProductsService = async (query: string, limit?: number) => {
  return searchProductsRepo(query, limit);
};
