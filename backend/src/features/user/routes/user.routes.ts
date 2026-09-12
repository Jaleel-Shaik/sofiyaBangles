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

// All user management routes require super_admin
router.use(authenticate);
router.use(requireRole("super_admin"));

router.get("/", getUsers);
router.get("/:id", getUserById);
router.patch("/:id/role", validate(updateUserRoleSchema), updateUserRole);

export default router;
