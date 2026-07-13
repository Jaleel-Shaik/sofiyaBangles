import { Router } from "express";
import {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  updateStock,
  deleteProduct,
  searchProducts,
  getRecommendedProducts,
  getNewArrivals,
} from "../controllers/product.controller";
import { authenticate, optionalAuthenticate } from "../middlewares/auth.middleware";
import { requireRole } from "../middlewares/role.middleware";
import { upload } from "../middlewares/upload.middleware";

const router = Router();

// Customer routes (publicly browsable with optional personalization)
router.get("/", optionalAuthenticate, getProducts);
router.get("/search", optionalAuthenticate, searchProducts);
router.get("/recommended", optionalAuthenticate, getRecommendedProducts);
router.get("/new-arrivals", optionalAuthenticate, getNewArrivals);
router.get("/:id", optionalAuthenticate, getProductById);

// Admin routes
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
router.delete(
  "/:id",
  authenticate,
  requireRole("admin", "super_admin"),
  deleteProduct,
);

export default router;
