import { Response } from "express";
import { AuthRequest } from "../../../shared/types";
import { getParam, getQuery } from "../../../shared/utils/params";
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

export const createProduct = async (req: AuthRequest, res: Response) => {
  try {
    const product = await createProductService(
      req.body,
      req.files as Express.Multer.File[] | undefined,
      req.user!.userId,
      req.user?.role as "admin" | "super_admin" | undefined,
    );

    res.status(201).json({
      success: true,
      data: product,
      message: "Product created successfully.",
    });
  } catch (error: any) {
    if (error.message === "MODEL_TYPE_NOT_FOUND") {
      res.status(400).json({
        success: false,
        code: "MODEL_TYPE_NOT_FOUND",
        message: "The selected model type does not exist.",
      });
      return;
    }
    if (error.message === "CATEGORY_NOT_FOUND") {
      res.status(400).json({
        success: false,
        code: "CATEGORY_NOT_FOUND",
        message: "The selected category does not exist or is inactive.",
      });
      return;
    }
    if (error.message === "INVALID_MODEL_CATEGORY_RELATIONSHIP") {
      res.status(400).json({
        success: false,
        code: "INVALID_MODEL_CATEGORY_RELATIONSHIP",
        message: "The selected category does not belong to the selected product model.",
      });
      return;
    }
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

export const getAdminProducts = async (req: AuthRequest, res: Response) => {
  try {
    const page = getQuery(req, "page");
    const limit = getQuery(req, "limit");

    const result = await getAdminProductsService({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
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
    console.error("GetAdminProducts error:", error);
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

    // For non-admin users, return 404 if product is inactive
    const userRole = req.user?.role;
    if (product && !product.is_active && userRole !== "admin" && userRole !== "super_admin") {
      res.status(404).json({
        success: false,
        message: "Product not found.",
      });
      return;
    }

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
      req.files as Express.Multer.File[] | undefined,
      req.user!.userId,
    );

    res.json({
      success: true,
      data: product,
      message: "Product updated successfully.",
    });
  } catch (error: any) {
    if (error.message === "MODEL_TYPE_NOT_FOUND") {
      res.status(400).json({
        success: false,
        code: "MODEL_TYPE_NOT_FOUND",
        message: "The selected model type does not exist.",
      });
      return;
    }
    if (error.message === "CATEGORY_NOT_FOUND") {
      res.status(400).json({
        success: false,
        code: "CATEGORY_NOT_FOUND",
        message: "The selected category does not exist or is inactive.",
      });
      return;
    }
    if (error.message === "INVALID_MODEL_CATEGORY_RELATIONSHIP") {
      res.status(400).json({
        success: false,
        code: "INVALID_MODEL_CATEGORY_RELATIONSHIP",
        message: "The selected category does not belong to the selected product model.",
      });
      return;
    }
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

export const sellProduct = async (req: AuthRequest, res: Response) => {
  try {
    const id = getParam(req, "id");
    const quantity = req.body.quantity ? Number(req.body.quantity) : 1;
    const product = await sellProductService(id, quantity, req.user!.userId);

    res.json({
      success: true,
      data: product,
      message: "Product sold successfully.",
    });
  } catch (error: any) {
    if (error.message === "PRODUCT_NOT_FOUND") {
      res.status(404).json({ success: false, message: "Product not found." });
      return;
    }
    if (error.message === "INSUFFICIENT_STOCK") {
      res.status(400).json({ success: false, message: "Insufficient stock." });
      return;
    }
    console.error("SellProduct error:", error);
    res.status(500).json({ success: false, message: "Failed to sell product." });
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

export const restoreProduct = async (req: AuthRequest, res: Response) => {
  try {
    const id = getParam(req, "id");
    const product = await restoreProductService(id, req.user!.userId);

    res.json({
      success: true,
      data: product,
      message: "Product restored successfully.",
    });
  } catch (error: any) {
    if (error.message === "PRODUCT_NOT_FOUND") {
      res.status(404).json({
        success: false,
        message: "Product not found.",
      });
      return;
    }
    console.error("RestoreProduct error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to restore product.",
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
      req.user?.userId
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

export const getRecommendedProducts = async (req: AuthRequest, res: Response) => {
  try {
    const page = getQuery(req, "page");
    const limit = getQuery(req, "limit");
    const search = getQuery(req, "search");

    const result = await getRecommendedProductsService({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
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
    console.error("GetRecommendedProducts error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch recommended products.",
    });
  }
};

export const getNewArrivals = async (req: AuthRequest, res: Response) => {
  try {
    const page = getQuery(req, "page");
    const limit = getQuery(req, "limit");
    const daysAgo = getQuery(req, "daysAgo");

    const result = await getNewArrivalsService({
      daysAgo: daysAgo ? Number(daysAgo) : undefined,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
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
    console.error("GetNewArrivals error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch new arrivals.",
    });
  }
};
