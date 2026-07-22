import { Router } from "express";
import {
  register,
  login,
  getMe,
  updateProfile,
  sendOtp,
  verifyOtp,
  verify2FAController,
  refreshTokenController,
  logoutController,
  regenerateQRController,
  disable2FAController,
  getSessionsController,
  setPasswordController,
  firebaseLoginController,
} from "../controllers/auth.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate.middleware";
import {
  registerSchema,
  loginSchema,
  verify2faSchema,
  refreshTokenSchema,
  regenerateQRSchema,
} from "../validations/auth.schema";

const router = Router();

// Public auth routes
router.post("/register", validate(registerSchema), register);
router.post("/login", validate(loginSchema), login);
router.post("/verify-2fa", validate(verify2faSchema), verify2FAController);
router.post("/refresh-token", validate(refreshTokenSchema), refreshTokenController);

// Legacy SMS OTP routes (kept for backwards compatibility)
router.post("/send-otp", sendOtp);
router.post("/verify-otp", verifyOtp);

// Firebase token login (for Firebase Auth-registered mobile users)
router.post("/firebase-login", firebaseLoginController);

// Password migration for Firebase Auth users
router.post("/set-password", setPasswordController);

// Protected routes
router.post("/logout", authenticate, logoutController);
router.get("/me", authenticate, getMe);
router.put("/me", authenticate, updateProfile);
router.post("/regenerate-qr", authenticate, regenerateQRController);
router.post("/disable-2fa", authenticate, disable2FAController);
router.get("/sessions", authenticate, getSessionsController);

export default router;

