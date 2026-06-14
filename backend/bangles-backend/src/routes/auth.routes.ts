import { Router } from "express";
import {
  register,
  login,
  getMe,
  updateProfile,
} from "../controllers/auth.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate.middleware";
import { registerSchema, loginSchema } from "../validations/auth.schema";

const router = Router();

// Public routes
router.post("/register", validate(registerSchema), register);
router.post("/login", validate(loginSchema), login);

// Protected routes
router.get("/me", authenticate, getMe);
router.put("/me", authenticate, updateProfile);

export default router;
