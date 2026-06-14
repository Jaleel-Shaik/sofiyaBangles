"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const category_controller_1 = require("../controllers/category.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const role_middleware_1 = require("../middlewares/role.middleware");
const validate_middleware_1 = require("../middlewares/validate.middleware");
const category_schema_1 = require("../validations/category.schema");
const router = (0, express_1.Router)();
// All category routes require authentication
router.use(auth_middleware_1.authenticate);
// Customer routes
router.get("/", category_controller_1.getCategories);
router.get("/:id/products", category_controller_1.getCategoryProducts);
// Admin routes
router.post("/", (0, role_middleware_1.requireRole)("admin", "super_admin"), (0, validate_middleware_1.validate)(category_schema_1.createCategorySchema), category_controller_1.createCategory);
router.put("/:id", (0, role_middleware_1.requireRole)("admin", "super_admin"), (0, validate_middleware_1.validate)(category_schema_1.updateCategorySchema), category_controller_1.updateCategory);
router.delete("/:id", (0, role_middleware_1.requireRole)("super_admin"), category_controller_1.deleteCategory);
exports.default = router;
