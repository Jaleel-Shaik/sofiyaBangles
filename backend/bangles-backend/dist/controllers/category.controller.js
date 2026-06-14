"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteCategory = exports.updateCategory = exports.createCategory = exports.getCategoryProducts = exports.getCategories = void 0;
const params_1 = require("../utils/params");
const category_service_1 = require("../services/category.service");
const product_service_1 = require("../services/product.service");
const getCategories = async (_req, res) => {
    try {
        const categories = await (0, category_service_1.getCategoriesService)();
        res.json({
            success: true,
            data: categories,
        });
    }
    catch (error) {
        console.error("GetCategories error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch categories.",
        });
    }
};
exports.getCategories = getCategories;
const getCategoryProducts = async (req, res) => {
    try {
        const id = (0, params_1.getParam)(req, "id");
        // Verify category exists
        await (0, category_service_1.getCategoryByIdService)(id);
        const page = (0, params_1.getQuery)(req, "page");
        const limit = (0, params_1.getQuery)(req, "limit");
        const result = await (0, product_service_1.getProductsService)({
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
    }
    catch (error) {
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
exports.getCategoryProducts = getCategoryProducts;
const createCategory = async (req, res) => {
    try {
        const category = await (0, category_service_1.createCategoryService)(req.body, req.user.userId);
        res.status(201).json({
            success: true,
            data: category,
            message: "Category created successfully.",
        });
    }
    catch (error) {
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
exports.createCategory = createCategory;
const updateCategory = async (req, res) => {
    try {
        const id = (0, params_1.getParam)(req, "id");
        const category = await (0, category_service_1.updateCategoryService)(id, req.body, req.user.userId);
        res.json({
            success: true,
            data: category,
            message: "Category updated successfully.",
        });
    }
    catch (error) {
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
exports.updateCategory = updateCategory;
const deleteCategory = async (req, res) => {
    try {
        const id = (0, params_1.getParam)(req, "id");
        await (0, category_service_1.deleteCategoryService)(id, req.user.userId);
        res.json({
            success: true,
            message: "Category deleted successfully.",
        });
    }
    catch (error) {
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
exports.deleteCategory = deleteCategory;
