import { Router } from "express";
import { authenticate } from "../../../shared/middlewares/auth.middleware";
import { requireRole } from "../../../shared/middlewares/role.middleware";
import {
  createOrder,
  getUserOrders,
  getAdminOrders,
  completeOrder,
  refundOrder,
  updateOrderStatus,
  createReview,
  getProductReviews,
} from "../controllers/order.controller";

const router = Router();
router.use(authenticate);

router.post("/", createOrder);
router.get("/", getUserOrders);
router.get("/admin/all", requireRole("admin", "super_admin"), getAdminOrders);
router.patch("/:id/status", requireRole("admin", "super_admin"), updateOrderStatus);
router.post("/:id/complete", requireRole("admin", "super_admin"), completeOrder);
router.post("/:id/refund", requireRole("admin", "super_admin"), refundOrder);
router.post("/reviews", createReview);
router.get("/products/:productId/reviews", getProductReviews);

export default router;
