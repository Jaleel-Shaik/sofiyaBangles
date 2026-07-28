import { Router } from "express";
import {
  getAllModelTypes,
  getModelTypeById,
  createModelType,
  updateModelType,
  deleteModelType,
} from "../controllers/modelType.controller";
import { authenticate } from "../../../shared/middlewares/auth.middleware";
import { requireRole } from "../../../shared/middlewares/role.middleware";
import { validate } from "../../../shared/middlewares/validate.middleware";
import { createModelTypeSchema, updateModelTypeSchema } from "../validations/modelType.validation";

const router = Router();

// Public routes
router.get("/", getAllModelTypes);
router.get("/:id", getModelTypeById);

// Admin only routes
router.use(authenticate);
router.use(requireRole("admin", "super_admin"));
router.post("/", validate(createModelTypeSchema), createModelType);
router.put("/:id", validate(updateModelTypeSchema), updateModelType);
router.delete("/:id", deleteModelType);

export default router;
