import { Response } from "express";
import { AuthRequest } from "../types";
import { getParam, getQuery } from "../utils/params";
import {
  getCategoriesService,
  getCategoryByIdService,
  createCategoryService,
  updateCategoryService,
  deleteCategoryService,
} from "../services/category.service";
import { getProductsService } from "../services/product.service";

export const getCategories = async (_req: AuthRequest, res: Response) => {
  try {
    const categories = await getCategoriesService();

    res.json({
      success: true,
      data: categories,
    });
  } catch (error: any) {
    console.error("GetCategories error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch categories.",
    });
  }
};

export const getCategoryProducts = async (
  req: AuthRequest,
  res: Response,
) => {
  try {
    const id = getParam(req, "id");

    // Verify category exists
    await getCategoryByIdService(id);

    const page = getQuery(req, "page");
    const limit = getQuery(req, "limit");

    const result = await getProductsService({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      categoryId: id,
      userId: req.user?.userId,
    });

    res.json({
      success: true,
      data: result.products,
      pagination: {
        page: Number(page) || 1,
        limit: Number(limit) || 20,
        total: result.total,
        totalPages: Math.ceil(result.total / (Number(limit) || 20)),
      },
    });
  } catch (error: any) {
    if (error.message === "CATEGORY_NOT_FOUND") {
      res.status(404).json({
        success: false,
        message: "Category not found.",
      });
      return;
    }
    console.error("GetCategoryProducts error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch products.",
    });
  }
};

export const createCategory = async (req: AuthRequest, res: Response) => {
  try {
    const category = await createCategoryService(req.body, req.user!.userId);

    res.status(201).json({
      success: true,
      data: category,
      message: "Category created successfully.",
    });
  } catch (error: any) {
    if (error.message?.includes("unique") || error.message?.includes("duplicate")) {
      res.status(409).json({
        success: false,
        message: "A category with this name already exists.",
      });
      return;
    }
    console.error("CreateCategory error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create category.",
    });
  }
};

export const updateCategory = async (req: AuthRequest, res: Response) => {
  try {
    const id = getParam(req, "id");
    const category = await updateCategoryService(id, req.body, req.user!.userId);

    res.json({
      success: true,
      data: category,
      message: "Category updated successfully.",
    });
  } catch (error: any) {
    if (error.message === "CATEGORY_NOT_FOUND") {
      res.status(404).json({
        success: false,
        message: "Category not found.",
      });
      return;
    }
    console.error("UpdateCategory error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update category.",
    });
  }
};

export const deleteCategory = async (req: AuthRequest, res: Response) => {
  try {
    const id = getParam(req, "id");
    await deleteCategoryService(id, req.user!.userId);

    res.json({
      success: true,
      message: "Category deleted successfully.",
    });
  } catch (error: any) {
    if (error.message === "CATEGORY_NOT_FOUND") {
      res.status(404).json({
        success: false,
        message: "Category not found.",
      });
      return;
    }
    console.error("DeleteCategory error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete category.",
    });
  }
};
