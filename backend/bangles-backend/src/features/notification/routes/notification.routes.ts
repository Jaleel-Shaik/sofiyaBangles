import { Router } from "express";
import {
  getNotifications,
  markAsRead,
  broadcastNotification,
  getUnreadCount,
} from "../controllers/notification.controller";
import { authenticate } from "../../../shared/middlewares/auth.middleware";
import { requireRole } from "../../../shared/middlewares/role.middleware";
import { validate } from "../../../shared/middlewares/validate.middleware";
import { broadcastNotificationSchema } from "../validations/notification.validation";

const router = Router();

// All notification routes require authentication
router.use(authenticate);

// User routes
router.get("/", getNotifications);
router.get("/unread-count", getUnreadCount);
router.patch("/:id/read", markAsRead);

// Admin routes
router.post(
  "/broadcast",
  requireRole("admin", "super_admin"),
  validate(broadcastNotificationSchema),
  broadcastNotification,
);

export default router;
