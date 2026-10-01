import { Router } from "express";
import {
  getUsers,
  getUserById,
  updateUserRole,
  lookupUserByPhone,
  createCustomerAccount,
  deleteSelfAccount,
  deleteUser,
} from "../controllers/user.controller";
import { authenticate } from "../../../shared/middlewares/auth.middleware";
import { requireRole } from "../../../shared/middlewares/role.middleware";
import { validate } from "../../../shared/middlewares/validate.middleware";
import { updateUserRoleSchema, createCustomerSchema } from "../validations/user.validation";

const router = Router();

// Protected routes require authentication
router.use(authenticate);

// Self-service account deletion (Google Play Store compliance & GDPR/Privacy)
router.delete("/me", deleteSelfAccount);

// Customer lookup & registration for Admin Quick Sell
router.get("/lookup", requireRole("admin", "super_admin"), lookupUserByPhone);
router.post("/customers", requireRole("admin", "super_admin"), validate(createCustomerSchema), createCustomerAccount);

// Admin & Super Admin can list users/customers
router.get("/", requireRole("admin", "super_admin"), getUsers);
router.get("/:id", requireRole("admin", "super_admin"), getUserById);

// Role modification and account deletion remain SuperAdmin exclusive
router.patch("/:id/role", requireRole("super_admin"), validate(updateUserRoleSchema), updateUserRole);
router.delete("/:id", requireRole("super_admin"), deleteUser);

export default router;

