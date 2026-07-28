import { Router } from "express";
import { authenticate } from "../../../shared/middlewares/auth.middleware";
import {
  createOrder,
  getUserOrders,
  createReview,
  getProductReviews,
} from "../controllers/order.controller";

const router = Router();
router.use(authenticate);

router.post("/", createOrder);
router.get("/", getUserOrders);
router.post("/reviews", createReview);
router.get("/products/:productId/reviews", getProductReviews);

export default router;
