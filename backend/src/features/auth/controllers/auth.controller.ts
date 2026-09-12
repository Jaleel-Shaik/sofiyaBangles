import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../../../shared/config/env";
import { AuthRequest, DeviceInformation } from "../../../shared/types";
import { resolvePlatform } from "../../../shared/utils/platform";
import { asyncHandler } from "../../../core/utils/async-handler";
import { sendSuccess } from "../../../core/utils/response";
import {
  registerService,
  getMeService,
  updateProfileService,
  uploadAvatarService,
  sendAdminOtpService,
  verifyAdminOtpService,
  firebaseLoginService,
  setPasswordService,
} from "../services/auth.service";
import {
  initiateLoginService,
  verify2FAOtpService,
  rotateRefreshTokenService,
  logoutService,
  regenerateQRService,
  disable2FAService,
  getUserSessionsService,
} from "../services/totp.service";

const extractDeviceInfo = (req: Request): DeviceInformation => {
  const userAgent = req.headers["user-agent"] || "";
  const ip = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "";
  const clientType = req.headers["x-client-type"] === "mobile" ? "mobile" : "web";

  return {
    client_type: clientType,
    ip_address: ip,
    user_agent: userAgent,
    browser: userAgent.includes("Chrome") ? "Chrome" : userAgent.includes("Safari") ? "Safari" : "Other",
    os: userAgent.includes("Windows") ? "Windows" : userAgent.includes("Android") ? "Android" : userAgent.includes("iOS") ? "iOS" : "Other",
  };
};

export const register = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await registerService(req.body);
  return sendSuccess(res, result, { message: "Registration successful.", statusCode: 201 });
});

export const login = asyncHandler(async (req: AuthRequest, res: Response) => {
  const deviceInfo = extractDeviceInfo(req);
  const platform = resolvePlatform(req.headers["x-client-type"] as string | undefined);
  const result = await initiateLoginService(req.body.email, req.body.password, deviceInfo, platform);
  const message = (result as any).message || "Login successful.";
  return sendSuccess(res, result, message);
});

export const getMe = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = await getMeService(req.user!.userId);
  return sendSuccess(res, user);
});

export const updateProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = await updateProfileService(req.user!.userId, req.body);
  return sendSuccess(res, user, "Profile updated successfully.");
});

export const uploadAvatar = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = await uploadAvatarService(req.user!.userId, req.file as Express.Multer.File);
  return sendSuccess(res, user, "Avatar uploaded successfully.");
});

export const sendOtp = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await sendAdminOtpService(req.body.email, req.body.phone);
  return sendSuccess(res, result, result.message);
});

export const verifyOtp = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await verifyAdminOtpService(req.body.email, req.body.otp);
  return res.json({ success: true, customToken: result.customToken, user: result.user });
});

export const verify2FAController = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { otp_pending_token, totp_code, backup_code, challenge_id, email } = req.body;
  const deviceInfo = extractDeviceInfo(req);
  const platform = resolvePlatform(req.headers["x-client-type"] as string | undefined);

  const result = await verify2FAOtpService(
    otp_pending_token,
    totp_code || backup_code,
    deviceInfo,
    platform,
    challenge_id,
    email,
    !!backup_code
  );

  return sendSuccess(res, result, (result as any).message || "2FA verification successful.");
});

export const refreshTokenController = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { refresh_token } = req.body;
  const deviceInfo = extractDeviceInfo(req);
  const platform = resolvePlatform(req.headers["x-client-type"] as string | undefined);

  const result = await rotateRefreshTokenService(
    refresh_token,
    platform,
    deviceInfo
  );

  return sendSuccess(res, result, "Token refreshed successfully.");
});

export const logoutController = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { refresh_token, session_id } = req.body;
  const deviceInfo = extractDeviceInfo(req);

  await logoutService(
    req.user!.userId,
    refresh_token,
    session_id,
    deviceInfo
  );

  return sendSuccess(res, null, "Logged out successfully.");
});

export const regenerateQRController = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { setup_token, challenge_id } = req.body;
  const deviceInfo = extractDeviceInfo(req);

  const decoded = jwt.verify(setup_token, env.JWT_SECRET) as any;
  const result = await regenerateQRService(
    decoded.userId,
    decoded.email,
    deviceInfo,
    challenge_id
  );

  return sendSuccess(res, result, "QR code regenerated successfully.");
});

export const disable2FAController = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { password } = req.body;

  await disable2FAService(req.user!.userId, password);

  return sendSuccess(res, null, "2FA disabled successfully.");
});

export const getSessionsController = asyncHandler(async (req: AuthRequest, res: Response) => {
  const sessions = await getUserSessionsService(req.user!.userId);
  return sendSuccess(res, sessions);
});

export const firebaseLoginController = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { firebase_token } = req.body;
  const deviceInfo = extractDeviceInfo(req);
  const platform = resolvePlatform(req.headers["x-client-type"] as string | undefined);

  const result = await firebaseLoginService(firebase_token, deviceInfo, platform);
  return sendSuccess(res, result, result.message || "Login successful.");
});

export const setPasswordController = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { email, password } = req.body;
  const result = await setPasswordService(email, password);
  return sendSuccess(res, result, result.message);
});
