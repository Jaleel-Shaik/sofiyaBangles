"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchProducts = exports.deleteProduct = exports.updateStock = exports.updateProduct = exports.getProductById = exports.getProducts = exports.createProduct = void 0;
const params_1 = require("../utils/params");
const product_service_1 = require("../services/product.service");
const createProduct = async (req, res) => {
    try {
        const product = await (0, product_service_1.createProductService)(req.body, req.file, req.user.userId);
        res.status(201).json({
            success: true,
            data: product,
            message: "Product created successfully.",
        });
    }
    catch (error) {
        console.error("CreateProduct error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to create product.",
        });
    }
};
exports.createProduct = createProduct;
const getProducts = async (req, res) => {
    try {
        const page = (0, params_1.getQuery)(req, "page");
        const limit = (0, params_1.getQuery)(req, "limit");
        const category_id = (0, params_1.getQuery)(req, "category_id");
        const search = (0, params_1.getQuery)(req, "search");
        const result = await (0, product_service_1.getProductsService)({
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
    }
    catch (error) {
        console.error("GetProducts error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch products.",
        });
    }
};
exports.getProducts = getProducts;
const getProductById = async (req, res) => {
    try {
        const id = (0, params_1.getParam)(req, "id");
        const product = await (0, product_service_1.getProductByIdService)(id, req.user?.userId);
        res.json({
            success: true,
            data: product,
        });
    }
    catch (error) {
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
exports.getProductById = getProductById;
const updateProduct = async (req, res) => {
    try {
        const id = (0, params_1.getParam)(req, "id");
        const product = await (0, product_service_1.updateProductService)(id, req.body, req.file, req.user.userId);
        res.json({
            success: true,
            data: product,
            message: "Product updated successfully.",
        });
    }
    catch (error) {
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
exports.updateProduct = updateProduct;
const updateStock = async (req, res) => {
    try {
        const id = (0, params_1.getParam)(req, "id");
        const product = await (0, product_service_1.updateStockService)(id, req.body.quantity, req.user.userId);
        res.json({
            success: true,
            data: product,
            message: "Stock updated successfully.",
        });
    }
    catch (error) {
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
exports.updateStock = updateStock;
const deleteProduct = async (req, res) => {
    try {
        const id = (0, params_1.getParam)(req, "id");
        await (0, product_service_1.deleteProductService)(id, req.user.userId);
        res.json({
            success: true,
            message: "Product deleted successfully.",
        });
    }
    catch (error) {
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
exports.deleteProduct = deleteProduct;
const searchProducts = async (req, res) => {
    try {
        const q = (0, params_1.getQuery)(req, "q");
        const limit = (0, params_1.getQuery)(req, "limit");
        if (!q || q.trim().length === 0) {
            res.status(400).json({
                success: false,
                message: "Search query is required.",
            });
            return;
        }
        const products = await (0, product_service_1.searchProductsService)(q, limit ? Number(limit) : undefined);
        res.json({
            success: true,
            data: products,
        });
    }
    catch (error) {
        console.error("SearchProducts error:", error);
        res.status(500).json({
            success: false,
            message: "Search failed.",
        });
    }
};
exports.searchProducts = searchProducts;
