"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const user_controller_1 = require("../controllers/user.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const role_middleware_1 = require("../middlewares/role.middleware");
const router = (0, express_1.Router)();
// All user management routes require super_admin
router.use(auth_middleware_1.authenticate);
router.use((0, role_middleware_1.requireRole)("super_admin"));
router.get("/", user_controller_1.getUsers);
router.get("/:id", user_controller_1.getUserById);
router.patch("/:id/role", user_controller_1.updateUserRole);
exports.default = router;
