import { Router } from "express";
import {
  getUsers,
  getUserById,
  updateUserRole,
} from "../controllers/user.controller";
import { authenticate } from "../../../shared/middlewares/auth.middleware";
import { requireRole } from "../../../shared/middlewares/role.middleware";
import { validate } from "../../../shared/middlewares/validate.middleware";
import { updateUserRoleSchema } from "../validations/user.validation";

const router = Router();

// Protected routes require authentication
router.use(authenticate);

// Admin & Super Admin can list users/customers
router.get("/", requireRole("admin", "super_admin"), getUsers);
router.get("/:id", requireRole("admin", "super_admin"), getUserById);

// Role modification remains SuperAdmin exclusive
router.patch("/:id/role", requireRole("super_admin"), validate(updateUserRoleSchema), updateUserRole);

export default router;
