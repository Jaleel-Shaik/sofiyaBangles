import { Router } from "express";
import {
  register,
  login,
  getMe,
  updateProfile,
  uploadAvatar,
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
import { authenticate } from "../../../shared/middlewares/auth.middleware";
import { validate } from "../../../shared/middlewares/validate.middleware";
import { upload } from "../../../shared/middlewares/upload.middleware";
import { authRateLimiter, otpRateLimiter } from "../../../core/middlewares/rate-limit.middleware";
import {
  registerSchema,
  loginSchema,
  verify2faSchema,
  refreshTokenSchema,
  regenerateQRSchema,
  sendOtpSchema,
  verifyOtpSchema,
  firebaseLoginSchema,
  setPasswordSchema,
} from "../validations/auth.validation";

const router = Router();

// Public auth routes
router.post("/register", validate(registerSchema), register);
router.post("/login", authRateLimiter, validate(loginSchema), login);
router.post("/verify-2fa", authRateLimiter, validate(verify2faSchema), verify2FAController);
router.post("/refresh-token", validate(refreshTokenSchema), refreshTokenController);

// SMS OTP routes
router.post("/send-otp", otpRateLimiter, validate(sendOtpSchema), sendOtp);
router.post("/verify-otp", otpRateLimiter, validate(verifyOtpSchema), verifyOtp);

// Firebase token login (for Firebase Auth-registered mobile users)
router.post("/firebase-login", validate(firebaseLoginSchema), firebaseLoginController);

// Password migration for Firebase Auth users
router.post("/set-password", validate(setPasswordSchema), setPasswordController);

// Protected routes
router.post("/logout", authenticate, logoutController);
router.get("/me", authenticate, getMe);
router.put("/me", authenticate, updateProfile);
router.post("/me/avatar", authenticate, upload.single("avatar"), uploadAvatar);
router.post("/regenerate-qr", validate(regenerateQRSchema), regenerateQRController);
router.post("/disable-2fa", authenticate, disable2FAController);
router.get("/sessions", authenticate, getSessionsController);

export default router;
