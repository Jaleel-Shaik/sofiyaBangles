import { Router } from "express";
import {
  getUsers,
  getUserById,
  updateUserRole,
} from "../controllers/user.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { requireRole } from "../middlewares/role.middleware";

const router = Router();

// All user management routes require super_admin
router.use(authenticate);
router.use(requireRole("super_admin"));

router.get("/", getUsers);
router.get("/:id", getUserById);
router.patch("/:id/role", updateUserRole);

export default router;
