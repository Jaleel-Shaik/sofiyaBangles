import { Router } from "express";
import {
  createProduct,
  getProducts,
  getAdminProducts,
  getProductById,
  updateProduct,
  updateStock,
  sellProduct,
  deleteProduct,
  restoreProduct,
  searchProducts,
  getRecommendedProducts,
  getNewArrivals,
} from "../controllers/product.controller";
import { authenticate, optionalAuthenticate } from "../../../shared/middlewares/auth.middleware";
import { requireRole } from "../../../shared/middlewares/role.middleware";
import { upload } from "../../../shared/middlewares/upload.middleware";

const router = Router();

// Admin routes (MUST be before /:id wildcard)
router.get(
  "/admin",
  authenticate,
  requireRole("admin", "super_admin"),
  getAdminProducts,
);
router.post(
  "/",
  authenticate,
  requireRole("admin", "super_admin"),
  upload.array("images", 5),
  createProduct,
);
router.put(
  "/:id",
  authenticate,
  requireRole("admin", "super_admin"),
  upload.array("images", 5),
  updateProduct,
);
router.patch(
  "/:id/stock",
  authenticate,
  requireRole("admin", "super_admin"),
  updateStock,
);
router.patch(
  "/:id/sell",
  authenticate,
  requireRole("admin", "super_admin"),
  sellProduct,
);
router.patch(
  "/:id/restore",
  authenticate,
  requireRole("admin", "super_admin"),
  restoreProduct,
);
router.delete(
  "/:id",
  authenticate,
  requireRole("admin", "super_admin"),
  deleteProduct,
);

// Customer routes (publicly browsable with optional personalization)
router.get("/", optionalAuthenticate, getProducts);
router.get("/search", optionalAuthenticate, searchProducts);
router.get("/recommended", optionalAuthenticate, getRecommendedProducts);
router.get("/new-arrivals", optionalAuthenticate, getNewArrivals);
router.get("/:id", optionalAuthenticate, getProductById);

export default router;
