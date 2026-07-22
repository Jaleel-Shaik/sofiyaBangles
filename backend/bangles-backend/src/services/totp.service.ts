import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { encryptSecret, decryptSecret } from "../utils/crypto.utils";
import { generateTotpSecret, generateQrCodeDataUrl, verifyTotpCode } from "../utils/totp.utils";
import { findProfileByEmailModel, findProfileByIdModel } from "../models/auth.model";
import {
  updateProfile2FA,
  getOtpStatusModel,
  recordOtpFailureModel,
  resetOtpFailuresModel,
  isOtpTokenUsedModel,
  markOtpTokenAsUsedModel,
  createRefreshTokenModel,
  createLoginSessionModel,
  create2FAAuditLogModel,
  findRefreshTokenModel,
  revokeRefreshTokenModel,
  invalidateSessionModel,
  revokeAllUserRefreshTokensModel,
  invalidateAllUserSessionsModel,
  getUserActiveSessionsModel,
  cleanupExpiredSessions,
  cleanupExpiredTokens,
} from "../models/totp.model";
import { DeviceInformation, JwtPayload } from "../types";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";

/**
 * Step 1: Initial Login (Password verification)
 */
export const initiateLoginService = async (
  email: string,
  password: string,
  deviceInfo: DeviceInformation
) => {
  const profile = await findProfileByEmailModel(email);
  if (!profile) {
    throw new Error("INVALID_CREDENTIALS");
  }

  if (!profile.is_active) {
    throw new Error("ACCOUNT_DISABLED");
  }

  // Password verification
  // Check for missing password_hash (e.g., users registered via Firebase Auth)
  if (!profile.password_hash) {
    await create2FAAuditLogModel({
      userId: profile.id,
      action: "PASSWORD_FAILED",
      deviceInfo,
      details: "Account has no local password hash. Use Firebase Auth to login.",
    });
    throw new Error("INVALID_CREDENTIALS");
  }
  
  const isValidPassword = await bcrypt.compare(password, profile.password_hash);
  if (!isValidPassword) {
    await create2FAAuditLogModel({
      userId: profile.id,
      action: "PASSWORD_FAILED",
      deviceInfo,
      details: "Invalid password attempt",
    });
    throw new Error("INVALID_CREDENTIALS");
  }

  await create2FAAuditLogModel({
    userId: profile.id,
    action: "PASSWORD_SUCCESS",
    deviceInfo,
  });

  // Check 2FA requirement for Admin and Super Admin
  const is2FAAdminRole = profile.role === "admin" || profile.role === "super_admin";

  if (!is2FAAdminRole) {
    // Regular users bypass Google Authenticator 2FA
    return await issueFullTokensAndSession(profile, deviceInfo);
  }

  // Check brute-force lockout status
  const otpStatus = await getOtpStatusModel(profile.id);
  if (otpStatus && otpStatus.locked_until && new Date(otpStatus.locked_until) > new Date()) {
    throw new Error("ACCOUNT_LOCKED_15_MINUTES");
  }

  // Check if 2FA is already enabled
  if (profile.is_2fa_enabled && profile.two_fa_secret) {
    // Generate temporary OTP pending token (5 min validity)
    const otpPendingToken = jwt.sign(
      { userId: profile.id, email: profile.email, role: profile.role, type: "OTP_PENDING" },
      env.JWT_SECRET,
      { expiresIn: "5m" }
    );

    return {
      require_otp: true,
      setup_required: false,
      otp_pending_token: otpPendingToken,
      message: "Please enter 6-digit Google Authenticator OTP.",
    };
  } else {
    // First Login Flow: Generate new TOTP secret & QR Code
    const { secret, otpauthUrl } = generateTotpSecret(profile.email);
    const encryptedSecret = encryptSecret(secret);
    const qrCodeUrl = await generateQrCodeDataUrl(otpauthUrl);

    // Save temporary encrypted secret in Firestore profile
    await updateProfile2FA(profile.id, encryptedSecret, false);

    // Generate temporary setup token (10 min validity)
    const setupToken = jwt.sign(
      { userId: profile.id, email: profile.email, role: profile.role, type: "2FA_SETUP" },
      env.JWT_SECRET,
      { expiresIn: "10m" }
    );

    return {
      require_otp: true,
      setup_required: true,
      qr_code_url: qrCodeUrl,
      otp_pending_token: setupToken,
      secret,
      otpauth_url: otpauthUrl,
      message: "First login detected. Scan QR code using Google Authenticator.",
    };
  }
};

/**
 * Step 2: Verify Google Authenticator OTP Code
 */
export const verify2FAOtpService = async (
  otpPendingToken: string,
  otpCode: string,
  deviceInfo: DeviceInformation
) => {
  let decoded: any;
  try {
    decoded = jwt.verify(otpPendingToken, env.JWT_SECRET);
  } catch (err) {
    throw new Error("EXPIRED_OR_INVALID_PENDING_TOKEN");
  }

  if (decoded.type !== "OTP_PENDING" && decoded.type !== "2FA_SETUP") {
    throw new Error("INVALID_PENDING_TOKEN_TYPE");
  }

  const userId = decoded.userId;
  const profile = await findProfileByIdModel(userId);
  if (!profile) {
    throw new Error("USER_NOT_FOUND");
  }

  // 1. Check Brute-force Lockout
  const otpStatus = await getOtpStatusModel(userId);
  if (otpStatus && otpStatus.locked_until && new Date(otpStatus.locked_until) > new Date()) {
    throw new Error("ACCOUNT_LOCKED_15_MINUTES");
  }

  // 2. Secret check
  if (!profile.two_fa_secret) {
    throw new Error("2FA_SECRET_NOT_FOUND");
  }

  // 3. Replay Attack Prevention
  const alreadyUsed = await isOtpTokenUsedModel(userId, otpCode);
  if (alreadyUsed) {
    await recordOtpFailureModel(userId);
    await create2FAAuditLogModel({
      userId,
      action: "OTP_FAILED",
      deviceInfo,
      details: "Replay attack detected. OTP already used.",
    });
    throw new Error("OTP_ALREADY_USED");
  }

  // 4. Decrypt secret and verify code
  const plainSecret = decryptSecret(profile.two_fa_secret);
  const isValid = verifyTotpCode(plainSecret, otpCode);

  if (!isValid) {
    const lockoutResult = await recordOtpFailureModel(userId);
    await create2FAAuditLogModel({
      userId,
      action: "OTP_FAILED",
      deviceInfo,
      details: lockoutResult.locked ? "Account locked after 5 failed attempts." : "Invalid OTP entered.",
    });

    if (lockoutResult.locked) {
      throw new Error("ACCOUNT_LOCKED_15_MINUTES");
    }
    throw new Error("INVALID_OTP");
  }

  // 5. Mark OTP as used (Replay protection)
  await markOtpTokenAsUsedModel(userId, otpCode);

  // 6. Reset failure counters
  await resetOtpFailuresModel(userId);

  // 7. If this was First Login Setup, enable 2FA permanently
  if (decoded.type === "2FA_SETUP" || !profile.is_2fa_enabled) {
    await updateProfile2FA(userId, profile.two_fa_secret, true);
    await create2FAAuditLogModel({
      userId,
      action: "2FA_ENABLED",
      deviceInfo,
      details: "Google Authenticator 2FA enabled successfully during first login.",
    });
  }

  await create2FAAuditLogModel({
    userId,
    action: "OTP_SUCCESS",
    deviceInfo,
  });

  // 8. Issue full Access JWT (1 week per requirements) & Refresh Token
  return await issueFullTokensAndSession(profile, deviceInfo);
};

/**
 * Issues Access JWT (1 week validity), Refresh Token, creates LoginSession & Audit Log
 */
const issueFullTokensAndSession = async (profile: any, deviceInfo: DeviceInformation) => {
  // Access Token: Valid for 7 days (1 week per project requirements)
  const accessToken = jwt.sign(
    {
      userId: profile.id,
      email: profile.email,
      role: profile.role,
    },
    env.JWT_SECRET,
    { expiresIn: "7d" }
  );

  // Refresh Token
  const rawRefreshToken = uuidv4();
  const refreshTokenRecord = await createRefreshTokenModel(profile.id, rawRefreshToken, 30);

  // Session
  const session = await createLoginSessionModel(profile.id, refreshTokenRecord.id, deviceInfo, 7);

  const { password_hash, two_fa_secret, ...safeUser } = profile;

  return {
    user: {
      ...safeUser,
      is_2fa_enabled: true,
    },
    access_token: accessToken,
    refresh_token: rawRefreshToken,
    session_id: session.id,
    expires_in: "7d",
  };
};

/**
 * Refresh Token Service (Token Rotation)
 */
export const rotateRefreshTokenService = async (rawRefreshToken: string, deviceInfo: DeviceInformation) => {
  const tokenRecord = await findRefreshTokenModel(rawRefreshToken);
  if (!tokenRecord || tokenRecord.is_revoked || new Date(tokenRecord.expires_at) < new Date()) {
    throw new Error("INVALID_OR_EXPIRED_REFRESH_TOKEN");
  }

  const profile = await findProfileByIdModel(tokenRecord.user_id);
  if (!profile) {
    throw new Error("USER_NOT_FOUND");
  }

  // Revoke old refresh token (Rotation)
  await revokeRefreshTokenModel(tokenRecord.id);

  // Generate new pair
  return await issueFullTokensAndSession(profile, deviceInfo);
};

/**
 * Logout Service (Session Invalidation)
 */
export const logoutService = async (userId: string, rawRefreshToken?: string, sessionId?: string) => {
  if (rawRefreshToken) {
    const tokenRecord = await findRefreshTokenModel(rawRefreshToken);
    if (tokenRecord) {
      await revokeRefreshTokenModel(tokenRecord.id);
    }
  }

  if (sessionId) {
    await invalidateSessionModel(sessionId);
  }

  await create2FAAuditLogModel({
    userId,
    action: "LOGOUT",
    deviceInfo: {},
    details: "User logged out successfully.",
  });
};

/**
 * Regenerate QR Code for 2FA Setup (when previous QR expired)
 */
export const regenerateQRService = async (userId: string, email: string) => {
  const profile = await findProfileByIdModel(userId);
  if (!profile) {
    throw new Error("USER_NOT_FOUND");
  }

  if (profile.is_2fa_enabled) {
    throw new Error("2FA_ALREADY_ENABLED");
  }

  // Generate new secret and QR code
  const { secret, otpauthUrl } = generateTotpSecret(email);
  const encryptedSecret = encryptSecret(secret);
  const qrCodeUrl = await generateQrCodeDataUrl(otpauthUrl);

  // Update the encrypted secret in DB
  await updateProfile2FA(userId, encryptedSecret, false);

  // Generate new setup token (10 min validity)
  const setupToken = jwt.sign(
    { userId: profile.id, email: profile.email, role: profile.role, type: "2FA_SETUP" },
    env.JWT_SECRET,
    { expiresIn: "10m" }
  );

  return {
    qr_code_url: qrCodeUrl,
    secret,
    otpauth_url: otpauthUrl,
    otp_pending_token: setupToken,
    message: "New QR code generated. Scan with Google Authenticator.",
  };
};

/**
 * Disable 2FA for a user (requires current password verification)
 */
export const disable2FAService = async (userId: string, password: string) => {
  const profile = await findProfileByIdModel(userId);
  if (!profile) {
    throw new Error("USER_NOT_FOUND");
  }

  if (!profile.is_2fa_enabled) {
    throw new Error("2FA_NOT_ENABLED");
  }

  // Verify password before disabling 2FA
  if (!profile.password_hash) {
    throw new Error("INVALID_PASSWORD");
  }
  const isValidPassword = await bcrypt.compare(password, profile.password_hash);
  if (!isValidPassword) {
    throw new Error("INVALID_PASSWORD");
  }

  // Disable 2FA and remove secret
  await updateProfile2FA(userId, null, false);

  // Cleanup all active sessions since 2FA was disabled (re-login required)
  await revokeAllUserSessionsService(userId);

  await create2FAAuditLogModel({
    userId,
    action: "2FA_ENABLED",
    deviceInfo: {},
    details: "Google Authenticator 2FA has been disabled by user.",
  });

  return { message: "2FA has been disabled successfully. All sessions have been terminated." };
};

/**
 * Get user's active sessions
 */
export const getUserSessionsService = async (userId: string) => {
  return await getUserActiveSessionsModel(userId);
};

/**
 * Revoke all user sessions (used when disabling 2FA or security events)
 */
export const revokeAllUserSessionsService = async (userId: string) => {
  await revokeAllUserRefreshTokensModel(userId);
  await invalidateAllUserSessionsModel(userId);
};

/**
 * Periodic cleanup of expired sessions and tokens
 */
export const cleanupExpiredSessionsAndTokens = async () => {
  const [expiredSessions, expiredTokens] = await Promise.all([
    cleanupExpiredSessions(),
    cleanupExpiredTokens(),
  ]);
  
  if (expiredSessions > 0 || expiredTokens > 0) {
    console.log(`🧹 Cleaned up ${expiredSessions} expired sessions and ${expiredTokens} expired refresh tokens`);
  }
};
