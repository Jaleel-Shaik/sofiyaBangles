"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const notification_controller_1 = require("../controllers/notification.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const role_middleware_1 = require("../middlewares/role.middleware");
const validate_middleware_1 = require("../middlewares/validate.middleware");
const notification_schema_1 = require("../validations/notification.schema");
const router = (0, express_1.Router)();
// All notification routes require authentication
router.use(auth_middleware_1.authenticate);
// User routes
router.get("/", notification_controller_1.getNotifications);
router.get("/unread-count", notification_controller_1.getUnreadCount);
router.patch("/:id/read", notification_controller_1.markAsRead);
// Admin routes
router.post("/broadcast", (0, role_middleware_1.requireRole)("admin", "super_admin"), (0, validate_middleware_1.validate)(notification_schema_1.broadcastNotificationSchema), notification_controller_1.broadcastNotification);
exports.default = router;
