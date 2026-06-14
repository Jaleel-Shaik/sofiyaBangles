import { Response } from "express";
import { AuthRequest } from "../types";
import { getParam, getQuery } from "../utils/params";
import {
  createProductService,
  getProductsService,
  getProductByIdService,
  updateProductService,
  updateStockService,
  deleteProductService,
  searchProductsService,
} from "../services/product.service";

export const createProduct = async (req: AuthRequest, res: Response) => {
  try {
    const product = await createProductService(
      req.body,
      req.file as Express.Multer.File | undefined,
      req.user!.userId,
    );

    res.status(201).json({
      success: true,
      data: product,
      message: "Product created successfully.",
    });
  } catch (error: any) {
    console.error("CreateProduct error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create product.",
    });
  }
};

export const getProducts = async (req: AuthRequest, res: Response) => {
  try {
    const page = getQuery(req, "page");
    const limit = getQuery(req, "limit");
    const category_id = getQuery(req, "category_id");
    const search = getQuery(req, "search");

    const result = await getProductsService({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      categoryId: category_id,
      search: search,
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
    console.error("GetProducts error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch products.",
    });
  }
};

export const getProductById = async (req: AuthRequest, res: Response) => {
  try {
    const id = getParam(req, "id");
    const product = await getProductByIdService(id, req.user?.userId);

    res.json({
      success: true,
      data: product,
    });
  } catch (error: any) {
    if (error.message === "PRODUCT_NOT_FOUND") {
      res.status(404).json({
        success: false,
        message: "Product not found.",
      });
      return;
    }
    console.error("GetProductById error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch product.",
    });
  }
};

export const updateProduct = async (req: AuthRequest, res: Response) => {
  try {
    const id = getParam(req, "id");
    const product = await updateProductService(
      id,
      req.body,
      req.file as Express.Multer.File | undefined,
      req.user!.userId,
    );

    res.json({
      success: true,
      data: product,
      message: "Product updated successfully.",
    });
  } catch (error: any) {
    if (error.message === "PRODUCT_NOT_FOUND") {
      res.status(404).json({
        success: false,
        message: "Product not found.",
      });
      return;
    }
    console.error("UpdateProduct error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update product.",
    });
  }
};

export const updateStock = async (req: AuthRequest, res: Response) => {
  try {
    const id = getParam(req, "id");
    const product = await updateStockService(
      id,
      req.body.quantity,
      req.user!.userId,
    );

    res.json({
      success: true,
      data: product,
      message: "Stock updated successfully.",
    });
  } catch (error: any) {
    if (error.message === "PRODUCT_NOT_FOUND") {
      res.status(404).json({
        success: false,
        message: "Product not found.",
      });
      return;
    }
    console.error("UpdateStock error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update stock.",
    });
  }
};

export const deleteProduct = async (req: AuthRequest, res: Response) => {
  try {
    const id = getParam(req, "id");
    await deleteProductService(id, req.user!.userId);

    res.json({
      success: true,
      message: "Product deleted successfully.",
    });
  } catch (error: any) {
    if (error.message === "PRODUCT_NOT_FOUND") {
      res.status(404).json({
        success: false,
        message: "Product not found.",
      });
      return;
    }
    console.error("DeleteProduct error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete product.",
    });
  }
};

export const searchProducts = async (req: AuthRequest, res: Response) => {
  try {
    const q = getQuery(req, "q");
    const limit = getQuery(req, "limit");

    if (!q || q.trim().length === 0) {
      res.status(400).json({
        success: false,
        message: "Search query is required.",
      });
      return;
    }

    const products = await searchProductsService(
      q,
      limit ? Number(limit) : undefined,
    );

    res.json({
      success: true,
      data: products,
    });
  } catch (error: any) {
    console.error("SearchProducts error:", error);
    res.status(500).json({
      success: false,
      message: "Search failed.",
    });
  }
};
