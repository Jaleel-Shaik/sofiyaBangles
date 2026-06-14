"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchProductsService = exports.deleteProductService = exports.updateStockService = exports.updateProductService = exports.getProductByIdService = exports.getProductsService = exports.createProductService = void 0;
const cloudinary_upload_1 = require("../utils/cloudinary-upload");
const product_repository_1 = require("../repositories/product.repository");
const audit_repository_1 = require("../repositories/audit.repository");
const createProductService = async (input, file, actorId) => {
    let imageUrl;
    if (file) {
        imageUrl = await (0, cloudinary_upload_1.uploadToCloudinary)(file);
    }
    const product = await (0, product_repository_1.createProductRepo)({
        ...input,
        image_url: imageUrl,
    });
    // Audit log
    await (0, audit_repository_1.createAuditLogRepo)({
        actor_id: actorId,
        action: "PRODUCT_CREATED",
        table_name: "products",
        record_id: product.id,
        new_data: { product_name: product.product_name, price: product.price },
    });
    return product;
};
exports.createProductService = createProductService;
const getProductsService = async (options) => {
    const page = options.page || 1;
    const limit = Math.min(options.limit || 20, 100);
    return (0, product_repository_1.getProductsRepo)({
        page,
        limit,
        categoryId: options.categoryId,
        search: options.search,
        userId: options.userId,
    });
};
exports.getProductsService = getProductsService;
const getProductByIdService = async (id, userId) => {
    const product = await (0, product_repository_1.getProductByIdRepo)(id, userId);
    if (!product) {
        throw new Error("PRODUCT_NOT_FOUND");
    }
    return product;
};
exports.getProductByIdService = getProductByIdService;
const updateProductService = async (id, input, file, actorId) => {
    // Verify product exists
    const existing = await (0, product_repository_1.getProductByIdRepo)(id);
    if (!existing) {
        throw new Error("PRODUCT_NOT_FOUND");
    }
    let imageUrl;
    if (file) {
        imageUrl = await (0, cloudinary_upload_1.uploadToCloudinary)(file);
    }
    const product = await (0, product_repository_1.updateProductRepo)(id, {
        ...input,
        ...(imageUrl && { image_url: imageUrl }),
    });
    // Audit log
    await (0, audit_repository_1.createAuditLogRepo)({
        actor_id: actorId,
        action: "PRODUCT_UPDATED",
        table_name: "products",
        record_id: id,
        old_data: { product_name: existing.product_name, price: existing.price },
        new_data: { product_name: product.product_name, price: product.price },
    });
    return product;
};
exports.updateProductService = updateProductService;
const updateStockService = async (id, quantity, actorId) => {
    const existing = await (0, product_repository_1.getProductByIdRepo)(id);
    if (!existing) {
        throw new Error("PRODUCT_NOT_FOUND");
    }
    const product = await (0, product_repository_1.updateProductRepo)(id, { quantity });
    // Audit log
    await (0, audit_repository_1.createAuditLogRepo)({
        actor_id: actorId,
        action: "STOCK_UPDATED",
        table_name: "products",
        record_id: id,
        old_data: { quantity: existing.quantity },
        new_data: { quantity },
    });
    return product;
};
exports.updateStockService = updateStockService;
const deleteProductService = async (id, actorId) => {
    const existing = await (0, product_repository_1.getProductByIdRepo)(id);
    if (!existing) {
        throw new Error("PRODUCT_NOT_FOUND");
    }
    await (0, product_repository_1.deleteProductRepo)(id);
    // Audit log
    await (0, audit_repository_1.createAuditLogRepo)({
        actor_id: actorId,
        action: "PRODUCT_DELETED",
        table_name: "products",
        record_id: id,
        old_data: { product_name: existing.product_name },
    });
};
exports.deleteProductService = deleteProductService;
const searchProductsService = async (query, limit) => {
    return (0, product_repository_1.searchProductsRepo)(query, limit);
};
exports.searchProductsService = searchProductsService;
