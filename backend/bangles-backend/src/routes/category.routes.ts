import { Router } from "express";
import {
  getCategories,
  getCategoryProducts,
  createCategory,
  updateCategory,
  deleteCategory,
} from "../controllers/category.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { requireRole } from "../middlewares/role.middleware";
import { validate } from "../middlewares/validate.middleware";
import {
  createCategorySchema,
  updateCategorySchema,
} from "../validations/category.schema";
import { upload } from "../middlewares/upload.middleware";

const router = Router();

// All category routes require authentication
router.use(authenticate);

// Customer routes
router.get("/", getCategories);
router.get("/:id/products", getCategoryProducts);

// Admin routes
router.post(
  "/",
  requireRole("admin", "super_admin"),
  upload.single("image"),
  validate(createCategorySchema),
  createCategory,
);
router.put(
  "/:id",
  requireRole("admin", "super_admin"),
  upload.single("image"),
  validate(updateCategorySchema),
  updateCategory,
);
router.delete(
  "/:id",
  requireRole("super_admin"),
  deleteCategory,
);

export default router;
