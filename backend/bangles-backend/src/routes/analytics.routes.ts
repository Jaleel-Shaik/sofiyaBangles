import { Router } from "express";
import {
  getOverview,
  getProductsByCategory,
  getRecentSignups,
} from "../controllers/analytics.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { requireRole } from "../middlewares/role.middleware";

const router = Router();

// All analytics routes require admin or above
router.use(authenticate);
router.use(requireRole("admin", "super_admin"));

router.get("/overview", getOverview);
router.get("/products-by-category", getProductsByCategory);

// Signup data is super_admin only
router.get(
  "/recent-signups",
  requireRole("super_admin"),
  getRecentSignups,
);

export default router;
