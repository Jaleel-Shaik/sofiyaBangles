import { Router } from "express";
import { authenticate, optionalAuthenticate } from "../../../shared/middlewares/auth.middleware";
import { requireRole } from "../../../shared/middlewares/role.middleware";
import { validate } from "../../../shared/middlewares/validate.middleware";
import { createOrderSchema, updateOrderStatusSchema, createReviewSchema } from "../validations/order.validation";
import {
  createOrder,
  getUserOrders,
  getOrderById,
  getAdminOrders,
  completeOrder,
  refundOrder,
  updateOrderStatus,
  createReview,
  getProductReviews,
} from "../controllers/order.controller";

const router = Router();

// Publicly readable product reviews (can be browsed by guests)
router.get("/products/:productId/reviews", optionalAuthenticate, getProductReviews);

// Protected routes require authentication
router.use(authenticate);

router.post("/", validate(createOrderSchema), createOrder);
router.get("/", getUserOrders);
router.get("/admin/all", requireRole("admin", "super_admin"), getAdminOrders);
router.post("/reviews", validate(createReviewSchema), createReview);
router.get("/:id", getOrderById);
router.patch("/:id/status", requireRole("admin", "super_admin"), validate(updateOrderStatusSchema), updateOrderStatus);
router.post("/:id/complete", requireRole("admin", "super_admin"), completeOrder);
router.post("/:id/refund", requireRole("admin", "super_admin"), refundOrder);

export default router;
