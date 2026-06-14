"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteCategoryService = exports.updateCategoryService = exports.createCategoryService = exports.getCategoryByIdService = exports.getCategoriesService = void 0;
const category_repository_1 = require("../repositories/category.repository");
const audit_repository_1 = require("../repositories/audit.repository");
const getCategoriesService = async () => {
    return (0, category_repository_1.getCategoriesRepo)();
};
exports.getCategoriesService = getCategoriesService;
const getCategoryByIdService = async (id) => {
    const category = await (0, category_repository_1.getCategoryByIdRepo)(id);
    if (!category) {
        throw new Error("CATEGORY_NOT_FOUND");
    }
    return category;
};
exports.getCategoryByIdService = getCategoryByIdService;
const createCategoryService = async (input, actorId) => {
    const category = await (0, category_repository_1.createCategoryRepo)(input);
    await (0, audit_repository_1.createAuditLogRepo)({
        actor_id: actorId,
        action: "CATEGORY_CREATED",
        table_name: "categories",
        record_id: category.id,
        new_data: { category_name: category.category_name },
    });
    return category;
};
exports.createCategoryService = createCategoryService;
const updateCategoryService = async (id, input, actorId) => {
    const existing = await (0, category_repository_1.getCategoryByIdRepo)(id);
    if (!existing) {
        throw new Error("CATEGORY_NOT_FOUND");
    }
    const category = await (0, category_repository_1.updateCategoryRepo)(id, input);
    await (0, audit_repository_1.createAuditLogRepo)({
        actor_id: actorId,
        action: "CATEGORY_UPDATED",
        table_name: "categories",
        record_id: id,
        old_data: { category_name: existing.category_name },
        new_data: { category_name: category.category_name },
    });
    return category;
};
exports.updateCategoryService = updateCategoryService;
const deleteCategoryService = async (id, actorId) => {
    const existing = await (0, category_repository_1.getCategoryByIdRepo)(id);
    if (!existing) {
        throw new Error("CATEGORY_NOT_FOUND");
    }
    await (0, category_repository_1.deleteCategoryRepo)(id);
    await (0, audit_repository_1.createAuditLogRepo)({
        actor_id: actorId,
        action: "CATEGORY_DELETED",
        table_name: "categories",
        record_id: id,
        old_data: { category_name: existing.category_name },
    });
};
exports.deleteCategoryService = deleteCategoryService;
