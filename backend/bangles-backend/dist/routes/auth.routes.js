"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_controller_1 = require("../controllers/auth.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const validate_middleware_1 = require("../middlewares/validate.middleware");
const auth_schema_1 = require("../validations/auth.schema");
const router = (0, express_1.Router)();
// Public routes
router.post("/register", (0, validate_middleware_1.validate)(auth_schema_1.registerSchema), auth_controller_1.register);
router.post("/login", (0, validate_middleware_1.validate)(auth_schema_1.loginSchema), auth_controller_1.login);
// Protected routes
router.get("/me", auth_middleware_1.authenticate, auth_controller_1.getMe);
router.put("/me", auth_middleware_1.authenticate, auth_controller_1.updateProfile);
exports.default = router;
