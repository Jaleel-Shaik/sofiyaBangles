import { Router } from "express";
import {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  updateStock,
  deleteProduct,
  searchProducts,
} from "../controllers/product.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { requireRole } from "../middlewares/role.middleware";
import { upload } from "../middlewares/upload.middleware";

const router = Router();

// All product routes require authentication
router.use(authenticate);

// Customer routes
router.get("/", getProducts);
router.get("/search", searchProducts);
router.get("/:id", getProductById);

// Admin routes
router.post(
  "/",
  requireRole("admin", "super_admin"),
  upload.array("images", 5),
  createProduct,
);
router.put(
  "/:id",
  requireRole("admin", "super_admin"),
  upload.array("images", 5),
  updateProduct,
);
router.patch(
  "/:id/stock",
  requireRole("admin", "super_admin"),
  updateStock,
);
router.delete(
  "/:id",
  requireRole("admin", "super_admin"),
  deleteProduct,
);

export default router;
