import { Router } from "express";
import { authenticate, optionalAuthenticate } from "../../../shared/middlewares/auth.middleware";
import { requireRole } from "../../../shared/middlewares/role.middleware";
import { validate } from "../../../shared/middlewares/validate.middleware";
import { purchaseRateLimiter } from "../../../core/middlewares/rate-limit.middleware";
import {
  createOrderSchema,
  updateOrderStatusSchema,
  createReviewSchema,
  whatsappPurchaseSchema,
} from "../validations/order.validation";
import {
  createOrder,
  initiateWhatsAppPurchase,
  getUserOrders,
  getOrderById,
  getAdminOrders,
  completeOrder,
  refundOrder,
  updateOrderStatus,
  deleteOrder,
  createReview,
  getProductReviews,
  getAllReviewsForAdmin,
  verifyAdminLink,
} from "../controllers/order.controller";

const router = Router();

// Publicly readable product reviews (can be browsed by guests)
router.get("/products/:productId/reviews", optionalAuthenticate, getProductReviews);

// Protected routes require authentication
router.use(authenticate);

router.post("/whatsapp-purchase", purchaseRateLimiter, validate(whatsappPurchaseSchema), initiateWhatsAppPurchase);
router.post("/verify-admin-link", requireRole("admin", "super_admin"), verifyAdminLink);
router.post("/", validate(createOrderSchema), createOrder);
router.get("/", getUserOrders);
router.get("/admin/all", requireRole("admin", "super_admin"), getAdminOrders);
router.get("/admin/reviews", requireRole("admin", "super_admin"), getAllReviewsForAdmin);
router.post("/reviews", validate(createReviewSchema), createReview);
router.get("/:id", getOrderById);
router.delete("/:id", requireRole("admin", "super_admin"), deleteOrder);
router.patch("/:id/status", requireRole("admin", "super_admin"), validate(updateOrderStatusSchema), updateOrderStatus);
router.post("/:id/complete", requireRole("admin", "super_admin"), completeOrder);
router.post("/:id/refund", requireRole("admin", "super_admin"), refundOrder);

export default router;
