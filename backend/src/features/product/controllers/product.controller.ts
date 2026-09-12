import { Response } from "express";
import { AuthRequest } from "../../../shared/types";
import { getParam, getQuery } from "../../../shared/utils/params";
import { asyncHandler } from "../../../core/utils/async-handler";
import { sendSuccess } from "../../../core/utils/response";
import {
  createProductService,
  getProductsService,
  getAdminProductsService,
  getProductByIdService,
  updateProductService,
  updateStockService,
  deleteProductService,
  restoreProductService,
  searchProductsService,
  getRecommendedProductsService,
  getNewArrivalsService,
  sellProductService,
} from "../services/product.service";
import { NotFoundError, BadRequestError } from "../../../core/errors/app.error";

export const createProduct = asyncHandler(async (req: AuthRequest, res: Response) => {
  try {
    const product = await createProductService(
      req.body,
      req.files as Express.Multer.File[] | undefined,
      req.user!.userId,
      req.user?.role as "admin" | "super_admin" | undefined
    );
    return sendSuccess(res, product, { message: "Product created successfully.", statusCode: 201 });
  } catch (err: any) {
    if (err.message === "MODEL_TYPE_NOT_FOUND") {
      throw new BadRequestError("The selected model type does not exist.", "MODEL_TYPE_NOT_FOUND");
    }
    if (err.message === "CATEGORY_NOT_FOUND") {
      throw new BadRequestError("The selected category does not exist or is inactive.", "CATEGORY_NOT_FOUND");
    }
    if (err.message === "INVALID_MODEL_CATEGORY_RELATIONSHIP") {
      throw new BadRequestError(
        "The selected category does not belong to the selected product model.",
        "INVALID_MODEL_CATEGORY_RELATIONSHIP"
      );
    }
    throw err;
  }
});

export const getProducts = asyncHandler(async (req: AuthRequest, res: Response) => {
  const page = getQuery(req, "page");
  const limit = getQuery(req, "limit");
  const category_id = getQuery(req, "category_id");
  const search = getQuery(req, "search");

  const pageNum = Number(page) || 1;
  const limitNum = Number(limit) || 20;

  const result = await getProductsService({
    page: page ? pageNum : undefined,
    limit: limit ? limitNum : undefined,
    categoryId: category_id,
    search: search,
    userId: req.user?.userId,
  });

  return sendSuccess(res, result.products, {
    pagination: {
      page: pageNum,
      limit: limitNum,
      total: result.total,
      totalPages: Math.ceil(result.total / limitNum),
    },
  });
});

export const getAdminProducts = asyncHandler(async (req: AuthRequest, res: Response) => {
  const page = getQuery(req, "page");
  const limit = getQuery(req, "limit");

  const pageNum = Number(page) || 1;
  const limitNum = Number(limit) || 20;

  const result = await getAdminProductsService({
    page: page ? pageNum : undefined,
    limit: limit ? limitNum : undefined,
  });

  return sendSuccess(res, result.products, {
    pagination: {
      page: pageNum,
      limit: limitNum,
      total: result.total,
      totalPages: Math.ceil(result.total / limitNum),
    },
  });
});

export const getProductById = asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = getParam(req, "id");
  let product: any;
  try {
    product = await getProductByIdService(id, req.user?.userId);
  } catch (err: any) {
    if (err.message === "PRODUCT_NOT_FOUND") throw new NotFoundError("Product not found.");
    throw err;
  }

  const userRole = req.user?.role;
  if (product && !product.is_active && userRole !== "admin" && userRole !== "super_admin") {
    throw new NotFoundError("Product not found.");
  }

  return sendSuccess(res, product);
});

export const updateProduct = asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = getParam(req, "id");

  try {
    const product = await updateProductService(
      id,
      req.body,
      req.files as Express.Multer.File[] | undefined,
      req.user!.userId
    );
    return sendSuccess(res, product, "Product updated successfully.");
  } catch (err: any) {
    if (err.message === "MODEL_TYPE_NOT_FOUND") {
      throw new BadRequestError("The selected model type does not exist.", "MODEL_TYPE_NOT_FOUND");
    }
    if (err.message === "CATEGORY_NOT_FOUND") {
      throw new BadRequestError("The selected category does not exist or is inactive.", "CATEGORY_NOT_FOUND");
    }
    if (err.message === "INVALID_MODEL_CATEGORY_RELATIONSHIP") {
      throw new BadRequestError(
        "The selected category does not belong to the selected product model.",
        "INVALID_MODEL_CATEGORY_RELATIONSHIP"
      );
    }
    if (err.message === "PRODUCT_NOT_FOUND") {
      throw new NotFoundError("Product not found.");
    }
    throw err;
  }
});

export const updateStock = asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = getParam(req, "id");
  try {
    const product = await updateStockService(id, req.body.quantity, req.user!.userId);
    return sendSuccess(res, product, "Stock updated successfully.");
  } catch (err: any) {
    if (err.message === "PRODUCT_NOT_FOUND") throw new NotFoundError("Product not found.");
    throw err;
  }
});

export const sellProduct = asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = getParam(req, "id");
  const quantity = req.body.quantity ? Number(req.body.quantity) : 1;
  try {
    const product = await sellProductService(id, quantity, req.user!.userId);
    return sendSuccess(res, product, "Product sold successfully.");
  } catch (err: any) {
    if (err.message === "PRODUCT_NOT_FOUND") throw new NotFoundError("Product not found.");
    if (err.message === "INSUFFICIENT_STOCK") throw new BadRequestError("Insufficient stock.");
    throw err;
  }
});

export const deleteProduct = asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = getParam(req, "id");
  try {
    await deleteProductService(id, req.user!.userId);
    return sendSuccess(res, null, "Product deleted successfully.");
  } catch (err: any) {
    if (err.message === "PRODUCT_NOT_FOUND") throw new NotFoundError("Product not found.");
    throw err;
  }
});

export const restoreProduct = asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = getParam(req, "id");
  try {
    const product = await restoreProductService(id, req.user!.userId);
    return sendSuccess(res, product, "Product restored successfully.");
  } catch (err: any) {
    if (err.message === "PRODUCT_NOT_FOUND") throw new NotFoundError("Product not found.");
    throw err;
  }
});

export const searchProducts = asyncHandler(async (req: AuthRequest, res: Response) => {
  const q = getQuery(req, "q");
  const limit = getQuery(req, "limit");

  if (!q || q.trim().length === 0) {
    throw new BadRequestError("Search query is required.");
  }

  const products = await searchProductsService(
    q,
    limit ? Number(limit) : undefined,
    req.user?.userId
  );

  return sendSuccess(res, products);
});

export const getRecommendedProducts = asyncHandler(async (req: AuthRequest, res: Response) => {
  const page = getQuery(req, "page");
  const limit = getQuery(req, "limit");
  const search = getQuery(req, "search");

  const pageNum = Number(page) || 1;
  const limitNum = Number(limit) || 20;

  const result = await getRecommendedProductsService({
    page: page ? pageNum : undefined,
    limit: limit ? limitNum : undefined,
    search: search,
    userId: req.user?.userId,
  });

  return sendSuccess(res, result.products, {
    pagination: {
      page: pageNum,
      limit: limitNum,
      total: result.total,
      totalPages: Math.ceil(result.total / limitNum),
    },
  });
});

export const getNewArrivals = asyncHandler(async (req: AuthRequest, res: Response) => {
  const page = getQuery(req, "page");
  const limit = getQuery(req, "limit");
  const daysAgo = getQuery(req, "daysAgo");

  const pageNum = Number(page) || 1;
  const limitNum = Number(limit) || 20;

  const result = await getNewArrivalsService({
    daysAgo: daysAgo ? Number(daysAgo) : undefined,
    page: page ? pageNum : undefined,
    limit: limit ? limitNum : undefined,
    userId: req.user?.userId,
  });

  return sendSuccess(res, result.products, {
    pagination: {
      page: pageNum,
      limit: limitNum,
      total: result.total,
      totalPages: Math.ceil(result.total / limitNum),
    },
  });
});
