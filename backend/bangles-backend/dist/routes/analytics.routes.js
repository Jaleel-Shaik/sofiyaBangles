"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const analytics_controller_1 = require("../controllers/analytics.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const role_middleware_1 = require("../middlewares/role.middleware");
const router = (0, express_1.Router)();
// All analytics routes require admin or above
router.use(auth_middleware_1.authenticate);
router.use((0, role_middleware_1.requireRole)("admin", "super_admin"));
router.get("/overview", analytics_controller_1.getOverview);
router.get("/products-by-category", analytics_controller_1.getProductsByCategory);
// Signup data is super_admin only
router.get("/recent-signups", (0, role_middleware_1.requireRole)("super_admin"), analytics_controller_1.getRecentSignups);
exports.default = router;
