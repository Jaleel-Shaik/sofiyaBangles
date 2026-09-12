import { Response } from "express";
import { AuthRequest } from "../../../shared/types";
import { getParam, getQuery } from "../../../shared/utils/params";
import { asyncHandler } from "../../../core/utils/async-handler";
import { sendSuccess } from "../../../core/utils/response";
import {
  getCategoriesService,
  getCategoryByIdService,
  createCategoryService,
  updateCategoryService,
  deleteCategoryService,
} from "../services/category.service";
import { getProductsService } from "../../product/services/product.service";
import { NotFoundError, BadRequestError, ConflictError } from "../../../core/errors/app.error";

export const getCategories = asyncHandler(async (req: AuthRequest, res: Response) => {
  const modelTypeId = getQuery(req, "model_type_id");
  const categories = await getCategoriesService(modelTypeId);
  return sendSuccess(res, categories);
});

export const getCategoryById = asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = getParam(req, "id");
  try {
    const category = await getCategoryByIdService(id);
    return sendSuccess(res, category);
  } catch (err: any) {
    if (err.message === "CATEGORY_NOT_FOUND") throw new NotFoundError("Category not found.");
    throw err;
  }
});

export const getCategoryProducts = asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = getParam(req, "id");
  try {
    await getCategoryByIdService(id);
  } catch (err: any) {
    if (err.message === "CATEGORY_NOT_FOUND") throw new NotFoundError("Category not found.");
    throw err;
  }

  const page = getQuery(req, "page");
  const limit = getQuery(req, "limit");

  const result = await getProductsService({
    page: page ? Number(page) : undefined,
    limit: limit ? Number(limit) : undefined,
    categoryId: id,
    userId: req.user?.userId,
  });

  return sendSuccess(res, result.products, {
    pagination: {
      page: Number(page) || 1,
      limit: Number(limit) || 20,
      total: result.total,
      totalPages: Math.ceil(result.total / (Number(limit) || 20)),
    },
  });
});

export const createCategory = asyncHandler(async (req: AuthRequest, res: Response) => {
  try {
    const category = await createCategoryService(
      { ...req.body },
      req.file as Express.Multer.File | undefined,
      req.user!.userId
    );
    return sendSuccess(res, category, { message: "Category created successfully.", statusCode: 201 });
  } catch (err: any) {
    if (err.message === "MODEL_TYPE_NOT_FOUND") {
      throw new BadRequestError("The selected model type does not exist.", "MODEL_TYPE_NOT_FOUND");
    }
    if (err.message === "CATEGORY_ALREADY_EXISTS") {
      throw new ConflictError("A category with this name already exists.", "CATEGORY_ALREADY_EXISTS");
    }
    throw err;
  }
});

export const updateCategory = asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = getParam(req, "id");
  try {
    const category = await updateCategoryService(
      id,
      { ...req.body },
      req.file as Express.Multer.File | undefined,
      req.user!.userId
    );
    return sendSuccess(res, category, "Category updated successfully.");
  } catch (err: any) {
    if (err.message === "CATEGORY_NOT_FOUND") throw new NotFoundError("Category not found.");
    if (err.message === "MODEL_TYPE_NOT_FOUND") {
      throw new BadRequestError("The selected model type does not exist.", "MODEL_TYPE_NOT_FOUND");
    }
    if (err.message === "CATEGORY_ALREADY_EXISTS") {
      throw new ConflictError("A category with this name already exists.", "CATEGORY_ALREADY_EXISTS");
    }
    throw err;
  }
});

export const deleteCategory = asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = getParam(req, "id");
  try {
    await deleteCategoryService(id, req.user!.userId);
    return sendSuccess(res, null, "Category deleted successfully.");
  } catch (err: any) {
    if (err.message === "CATEGORY_NOT_FOUND") throw new NotFoundError("Category not found.");
    if (err.message === "CATEGORY_HAS_PRODUCTS") {
      throw new ConflictError(
        `Cannot delete this category because ${err.productCount} product(s) are assigned to it. Move or archive those products first.`,
        "CATEGORY_HAS_PRODUCTS"
      );
    }
    throw err;
  }
});
