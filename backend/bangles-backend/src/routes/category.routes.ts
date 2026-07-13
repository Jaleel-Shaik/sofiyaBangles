import { Router } from "express";
import {
  getCategories,
  getCategoryProducts,
  createCategory,
  updateCategory,
  deleteCategory,
} from "../controllers/category.controller";
import { authenticate, optionalAuthenticate } from "../middlewares/auth.middleware";
import { requireRole } from "../middlewares/role.middleware";
import { validate } from "../middlewares/validate.middleware";
import {
  createCategorySchema,
  updateCategorySchema,
} from "../validations/category.schema";
import { upload } from "../middlewares/upload.middleware";

const router = Router();

// Customer routes (publicly browsable)
router.get("/", optionalAuthenticate, getCategories);
router.get("/:id/products", optionalAuthenticate, getCategoryProducts);

// Admin routes
router.post(
  "/",
  authenticate,
  requireRole("admin", "super_admin"),
  upload.single("image"),
  validate(createCategorySchema),
  createCategory,
);
router.put(
  "/:id",
  authenticate,
  requireRole("admin", "super_admin"),
  upload.single("image"),
  validate(updateCategorySchema),
  updateCategory,
);
router.delete(
  "/:id",
  authenticate,
  requireRole("super_admin"),
  deleteCategory,
);

export default router;
