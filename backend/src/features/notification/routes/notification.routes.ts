import { Router } from "express";
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearAllNotifications,
  broadcastNotification,
  getUnreadCount,
} from "../controllers/notification.controller";
import { authenticate, optionalAuthenticate } from "../../../shared/middlewares/auth.middleware";
import { requireRole } from "../../../shared/middlewares/role.middleware";
import { validate } from "../../../shared/middlewares/validate.middleware";
import { broadcastNotificationSchema } from "../validations/notification.validation";

const router = Router();

// User routes (allow optional authentication for reading notification announcements)
router.get("/", optionalAuthenticate, getNotifications);
router.get("/unread-count", optionalAuthenticate, getUnreadCount);

// Specific action routes (MUST be placed before parameterized /:id routes)
router.patch("/read-all", authenticate, markAllAsRead);
router.delete("/clear-all", authenticate, clearAllNotifications);

// Single notification routes
router.patch("/:id/read", authenticate, markAsRead);
router.delete("/:id", authenticate, deleteNotification);

// Admin routes (support both /broadcast and /)
router.post(
  "/broadcast",
  authenticate,
  requireRole("admin", "super_admin"),
  validate(broadcastNotificationSchema),
  broadcastNotification,
);
router.post(
  "/",
  authenticate,
  requireRole("admin", "super_admin"),
  validate(broadcastNotificationSchema),
  broadcastNotification,
);

export default router;

