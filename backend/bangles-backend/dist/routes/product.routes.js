"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const product_controller_1 = require("../controllers/product.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const role_middleware_1 = require("../middlewares/role.middleware");
const upload_middleware_1 = require("../middlewares/upload.middleware");
const router = (0, express_1.Router)();
// All product routes require authentication
router.use(auth_middleware_1.authenticate);
// Customer routes
router.get("/", product_controller_1.getProducts);
router.get("/search", product_controller_1.searchProducts);
router.get("/:id", product_controller_1.getProductById);
// Admin routes
router.post("/", (0, role_middleware_1.requireRole)("admin", "super_admin"), upload_middleware_1.upload.single("image"), product_controller_1.createProduct);
router.put("/:id", (0, role_middleware_1.requireRole)("admin", "super_admin"), upload_middleware_1.upload.single("image"), product_controller_1.updateProduct);
router.patch("/:id/stock", (0, role_middleware_1.requireRole)("admin", "super_admin"), product_controller_1.updateStock);
router.delete("/:id", (0, role_middleware_1.requireRole)("admin", "super_admin"), product_controller_1.deleteProduct);
exports.default = router;
