import jwt from "jsonwebtoken";
import { env } from "../../../shared/config/env";
import { encryptSecret, decryptSecret } from "../../../shared/utils/crypto.utils";
import { generateTotpSecret, generateQrCodeDataUrl, verifyTotpCode } from "../../../shared/utils/totp.utils";
import { findProfileByIdModel } from "../models/auth.model";
import { findIdentityByEmailModel, findIdentityByIdModel } from "../../../shared/models/identity.model";
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
  deleteRefreshTokenModel,
  deleteLoginSessionModel,
  findLoginSessionModel,
  createLoginChallengeModel,
  findLoginChallengeModel,
  deleteLoginChallengeModel,
  updateLoginChallengeModel,
  revokeAllUserRefreshTokensModel,
  invalidateAllUserSessionsModel,
  getUserActiveSessionsModel,
  cleanupExpiredChallenges,
  cleanupExpiredSessions,
  cleanupExpiredTokens,
  cleanupOldAuditLogs,
  cleanupOldSecurityEvents,
  cleanupExpiredUsedOtpTokens,
} from "../models/totp.model";
import { createSecurityEventModel } from "../models/security.model";
import { createAuditLogModel, findAuditLogByRecordModel } from "../../../shared/models/audit.model";
import { DeviceInformation, UserType, Platform } from "../../../shared/types";
import { getRoleAuthConfig, requires2FAEnforcement } from "../../../shared/utils/auth-config";
import { nowISTISO } from "../../../shared/utils/datetime";
import { assertPlatformAccess } from "../../../shared/utils/platform";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";

/**
 * Step 1: Initial Login (Password verification)
 *
 * After the password is verified a temporary `login_challenges` record is
 * created (challengeId + expiry). The OTP/2FA step then completes the login.
 */
export const initiateLoginService = async (
  email: string,
  password: string,
  deviceInfo: DeviceInformation,
  platform: Platform
) => {
  const identity = await findIdentityByEmailModel(email);
  if (!identity) {
    throw new Error("INVALID_CREDENTIALS");
  }

  const profile = identity.profile;
  const userType = identity.user_type;

  if (!profile.is_active) {
    throw new Error("ACCOUNT_DISABLED");
  }

  const correlationId = "AUTH-" + uuidv4();

  if (!profile.password_hash) {
    await create2FAAuditLogModel({
      userId: profile.id,
      userType,
      action: "PASSWORD_FAILED",
      deviceInfo,
      details: "Account has no local password hash. Use Firebase Auth to login.",
      correlationId,
    });
    throw new Error("PASSWORD_NOT_SET");
  }

  const isValidPassword = await bcrypt.compare(password, profile.password_hash);
  if (!isValidPassword) {
    await create2FAAuditLogModel({
      userId: profile.id,
      userType,
      action: "PASSWORD_FAILED",
      deviceInfo,
      details: "Invalid password attempt",
      correlationId,
    });
    throw new Error("INVALID_CREDENTIALS");
  }

  await create2FAAuditLogModel({
    userId: profile.id,
    userType,
    action: "PASSWORD_SUCCESS",
    deviceInfo,
    correlationId,
  });

  // Verify platform access before proceeding
  assertPlatformAccess(profile.role, platform);

  // Check 2FA requirement
  const roleConfig = getRoleAuthConfig(profile.role);
  const has2FAEnabled = profile.is_2fa_enabled && profile.two_fa_secret;
  const roleRequires2FA = requires2FAEnforcement(profile.role);

  if (has2FAEnabled) {
    // 2FA already enabled (any role) - verify OTP
    const otpStatus = await getOtpStatusModel(profile.id);
    if (otpStatus && otpStatus.locked_until && new Date(otpStatus.locked_until) > new Date()) {
      throw new Error("ACCOUNT_LOCKED_15_MINUTES");
    }

    // Create a temporary login challenge
    const challenge = await createLoginChallengeModel({ userId: profile.id, userType, deviceInfo, correlationId });

    const otpPendingToken = jwt.sign(
      { userId: profile.id, email: profile.email, role: profile.role, userType, type: "OTP_PENDING", challengeId: challenge.id, platform },
      env.JWT_SECRET,
      { expiresIn: roleConfig.otpPendingExpiry } as jwt.SignOptions
    );

    return {
      require_otp: true,
      setup_required: false,
      otp_pending_token: otpPendingToken,
      challenge_id: challenge.id,
      message: "Please enter 6-digit Google Authenticator OTP.",
    };
  } else if (roleRequires2FA) {
    // First login: setup 2FA + temporary challenge
    // Always generate a new TOTP secret to invalidate any previous setup QR codes
    const result = generateTotpSecret(profile.email);
    const secret = result.secret;
    const encryptedSecret = encryptSecret(secret);
    const qrCodeUrl = await generateQrCodeDataUrl(result.otpauthUrl);

    await updateProfile2FA(profile.id, encryptedSecret, false);

    const challenge = await createLoginChallengeModel({ userId: profile.id, userType, deviceInfo, correlationId });

    const setupToken = jwt.sign(
      { userId: profile.id, email: profile.email, role: profile.role, userType, type: "2FA_SETUP", challengeId: challenge.id, platform },
      env.JWT_SECRET,
      { expiresIn: roleConfig.qrSetupExpiry } as jwt.SignOptions
    );

    return {
      require_otp: true,
      setup_required: true,
      qr_code_url: qrCodeUrl,
      otp_pending_token: setupToken,
      challenge_id: challenge.id,
      secret,
      otpauth_url: `otpauth://totp/${encodeURIComponent("Sofiya Bangles")}:${encodeURIComponent(profile.email)}?secret=${secret}&issuer=${encodeURIComponent("Sofiya Bangles")}&algorithm=SHA1&digits=6&period=30`,
      message: "Scan QR code using Google Authenticator.",
    };
  } else {
    // No 2FA requirement - issue tokens directly
    return await issueFullTokensAndSession(profile, userType, deviceInfo, platform, roleConfig, correlationId);
  }
};

/**
 * Resolves the pending login challenge either from the request body
 * (challenge_id) or from the otp_pending_token JWT payload (legacy clients).
 */
const resolveLoginChallenge = async (bodyChallengeId: string | undefined, decodedToken: any) => {
  const challengeId = bodyChallengeId || decodedToken?.challengeId;
  if (!challengeId) {
    throw new Error("EXPIRED_OR_INVALID_PENDING_TOKEN");
  }

  const challenge = await findLoginChallengeModel(challengeId);
  if (!challenge) {
    throw new Error("EXPIRED_OR_INVALID_PENDING_TOKEN");
  }
  if (challenge.status !== "PENDING") {
    throw new Error("EXPIRED_OR_INVALID_PENDING_TOKEN");
  }
  if (new Date(challenge.expires_at) < new Date()) {
    await updateLoginChallengeModel(challenge.id, { status: "EXPIRED" });
    throw new Error("EXPIRED_OR_INVALID_PENDING_TOKEN");
  }

  return challenge;
};

/**
 * Step 2: Verify Google Authenticator OTP Code against the login challenge
 */
export const verify2FAOtpService = async (
  otpPendingToken: string,
  otpCode: string,
  deviceInfo: DeviceInformation,
  platform: Platform,
  bodyChallengeId?: string
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
  const challenge = await resolveLoginChallenge(bodyChallengeId, decoded);

  // The challenge must belong to the same account as the verified token
  if (challenge.user_id !== userId) {
    throw new Error("EXPIRED_OR_INVALID_PENDING_TOKEN");
  }

  const profile = await findProfileByIdModel(userId);
  if (!profile) {
    throw new Error("USER_NOT_FOUND");
  }

  // Verify platform access before proceeding
  assertPlatformAccess(profile.role, platform);

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
      userType: challenge.user_type,
      action: "OTP_FAILED",
      deviceInfo,
      details: "Replay attack detected. OTP already used.",
      correlationId: challenge.correlation_id,
    });
    throw new Error("OTP_ALREADY_USED");
  }

  // 4. Decrypt secret and verify code
  const plainSecret = decryptSecret(profile.two_fa_secret);
  const isValid = verifyTotpCode(plainSecret, otpCode);

  if (!isValid) {
    await updateLoginChallengeModel(challenge.id, {
      failed_attempts: challenge.failed_attempts + 1,
    });

    const lockoutResult = await recordOtpFailureModel(userId);
    await create2FAAuditLogModel({
      userId,
      userType: challenge.user_type,
      action: "OTP_FAILED",
      deviceInfo,
      details: lockoutResult.locked ? "Account locked after 5 failed attempts." : "Invalid OTP entered.",
      correlationId: challenge.correlation_id,
    });

    if (lockoutResult.locked) {
      await createSecurityEventModel({
        userId,
        userType: challenge.user_type,
        eventType: "ACCOUNT_LOCKED",
        severity: "critical",
        deviceInfo,
        details: "Account locked for 15 minutes after 5 consecutive wrong OTP attempts.",
      });
      throw new Error("ACCOUNT_LOCKED_15_MINUTES");
    }
    throw new Error("INVALID_OTP");
  }

  // 5. Mark OTP as used (Replay protection)
  await markOtpTokenAsUsedModel(userId, otpCode);

  // 6. Reset failure counters
  await resetOtpFailuresModel(userId);

  // 7. Mark challenge verified then delete it (temporary record)
  await updateLoginChallengeModel(challenge.id, {
    status: "VERIFIED",
    verified_at: new Date().toISOString(),
  });
  await deleteLoginChallengeModel(challenge.id);

  // 8. If this was First Login Setup, enable 2FA permanently
  if (decoded.type === "2FA_SETUP" || !profile.is_2fa_enabled) {
    await updateProfile2FA(userId, profile.two_fa_secret, true);
    await createSecurityEventModel({
      userId,
      userType: challenge.user_type,
      eventType: "2FA_ENABLED",
      severity: "warning",
      deviceInfo,
      details: "Google Authenticator 2FA enabled successfully during first login.",
    });
    await create2FAAuditLogModel({
      userId,
      userType: challenge.user_type,
      action: "2FA_ENABLED",
      deviceInfo,
      details: "Google Authenticator 2FA enabled successfully during first login.",
      correlationId: challenge.correlation_id,
    });
  }

  await create2FAAuditLogModel({
    userId,
    userType: challenge.user_type,
    action: "OTP_SUCCESS",
    deviceInfo,
    correlationId: challenge.correlation_id,
  });

  // 9. Issue full Access JWT & Refresh Token (role-based)
  const roleConfig = getRoleAuthConfig(profile.role);
  return await issueFullTokensAndSession(profile, challenge.user_type, deviceInfo, platform, roleConfig, challenge.correlation_id);
};

/**
 * Issues Access JWT, Refresh Token, creates LoginSession & Audit Log.
 * Uses role-specific configuration.
 */
const issueFullTokensAndSession = async (
  profile: any,
  userType: UserType,
  deviceInfo: DeviceInformation,
  platform: Platform,
  roleConfig?: { accessTokenExpiry: string; sessionExpiryDays: number; refreshTokenExpiryDays: number },
  correlationId?: string
) => {
  if (!roleConfig) {
    roleConfig = getRoleAuthConfig(profile.role);
  }

  const now = new Date().toISOString();

  const accessToken = jwt.sign(
    {
      userId: profile.id,
      email: profile.email,
      role: profile.role,
      userType,
      platform,
    },
    env.JWT_SECRET,
    { expiresIn: roleConfig.accessTokenExpiry } as jwt.SignOptions
  );

  const rawRefreshToken = uuidv4();
  const refreshTokenRecord = await createRefreshTokenModel(profile.id, userType, rawRefreshToken, roleConfig.refreshTokenExpiryDays, platform);

  const session = await createLoginSessionModel(profile.id, userType, refreshTokenRecord.id, deviceInfo, roleConfig.sessionExpiryDays);

  // Permanent audit record with login time + ip for the session.
  await createAuditLoginSuccess(profile.id, userType, session.id, deviceInfo, correlationId);

  const { password_hash, two_fa_secret, ...safeUser } = profile;

  return {
    user: {
      ...safeUser,
      is_2fa_enabled: safeUser.is_2fa_enabled ?? !!profile.two_fa_secret,
    },
    access_token: accessToken,
    refresh_token: rawRefreshToken,
    session_id: session.id,
    expires_in: roleConfig.accessTokenExpiry,
  };
};

const createAuditLoginSuccess = async (
  userId: string,
  userType: UserType,
  sessionId: string,
  deviceInfo: DeviceInformation,
  correlationId?: string,
) => {
  await createAuditLogModel({
    actor_id: userId,
    user_type: userType,
    action: "LOGIN_SUCCESS",
    table_name: "login_sessions",
    record_id: sessionId,
    session_id: sessionId,
    correlation_id: correlationId,
    ip_address: deviceInfo.ip_address || "",
  });
};

/**
 * Refresh Token Service (Token Rotation)
 * The old token is hard-deleted since a new pair is issued.
 */
export const rotateRefreshTokenService = async (rawRefreshToken: string, platform: Platform, deviceInfo: DeviceInformation) => {
  const tokenRecord = await findRefreshTokenModel(rawRefreshToken);
  if (!tokenRecord || tokenRecord.is_revoked || new Date(tokenRecord.expires_at) < new Date()) {
    throw new Error("INVALID_OR_EXPIRED_REFRESH_TOKEN");
  }

  // Enforce platform check on refresh token rotation
  const tokenPlatform = tokenRecord.platform || platform; // fallback to current platform for pre-migration tokens
  if (tokenPlatform !== platform) {
    throw new Error("INVALID_OR_EXPIRED_REFRESH_TOKEN");
  }

  const identity = await findIdentityByIdModel(tokenRecord.user_id);
  if (!identity) {
    throw new Error("USER_NOT_FOUND");
  }

  // Verify platform access for this role is still allowed
  assertPlatformAccess(identity.profile.role, platform);

  // Hard-delete the old token (temporary record) and issue a new pair
  await deleteRefreshTokenModel(tokenRecord.id);

  await createSecurityEventModel({
    userId: tokenRecord.user_id,
    userType: tokenRecord.user_type,
    eventType: "TOKEN_REFRESHED",
    severity: "info",
    deviceInfo,
    details: "Refresh token rotation.",
  });
  await create2FAAuditLogModel({
    userId: tokenRecord.user_id,
    userType: tokenRecord.user_type,
    action: "TOKEN_REFRESHED",
    deviceInfo,
  });

  return await issueFullTokensAndSession(identity.profile, identity.user_type, deviceInfo, platform);
};

/**
 * Logout Service (Session Invalidation)
 *
 * Requirement: after logout the user's session and refresh token are
 * DELETED PERMANENTLY (not just flagged). The logout time is written to
 * the permanent audit record created at login.
 */
export const logoutService = async (userId: string, rawRefreshToken?: string, sessionId?: string, deviceInfo: DeviceInformation = {}) => {
  const logoutTime = nowISTISO();
  let loginTime: string | null = null;
  let userType: UserType | null = null;

  if (sessionId) {
    const session = await findLoginSessionModel(sessionId);
    if (session && session.user_id === userId) {
      userType = session.user_type || null;
      // Permanently delete the temporary session record
      await deleteLoginSessionModel(session.id);
    }
  }

  if (!userType) {
    const identity = await findIdentityByIdModel(userId);
    userType = identity?.user_type || null;
  }

  if (rawRefreshToken) {
    const tokenRecord = await findRefreshTokenModel(rawRefreshToken);
    if (tokenRecord) {
      // Permanently delete the temporary refresh token record
      await deleteRefreshTokenModel(tokenRecord.id);
    }
  }

  await create2FAAuditLogModel({
    userId,
    userType,
    action: "LOGOUT",
    deviceInfo,
    sessionId,
    details: "User logged out successfully. Session deleted permanently.",
  });
};

/**
 * Regenerate QR Code for 2FA Setup. Rotates the pending login challenge.
 */
export const regenerateQRService = async (userId: string, email: string, deviceInfo: DeviceInformation = {}, oldChallengeId?: string) => {
  const profile = await findProfileByIdModel(userId);
  if (!profile) {
    throw new Error("USER_NOT_FOUND");
  }

  if (profile.is_2fa_enabled) {
    throw new Error("2FA_ALREADY_ENABLED");
  }

  // Delete any previous pending challenge (temporary record)
  if (oldChallengeId) {
    await deleteLoginChallengeModel(oldChallengeId);
  }

  const identity = await findIdentityByIdModel(userId);

  const { secret, otpauthUrl } = generateTotpSecret(email);
  const encryptedSecret = encryptSecret(secret);
  const qrCodeUrl = await generateQrCodeDataUrl(otpauthUrl);

  await updateProfile2FA(userId, encryptedSecret, false);

  const challenge = await createLoginChallengeModel({
    userId,
    userType: identity?.user_type || "admin",
    deviceInfo,
  });

  const setupToken = jwt.sign(
    { userId: profile.id, email: profile.email, role: profile.role, userType: identity?.user_type, type: "2FA_SETUP", challengeId: challenge.id },
    env.JWT_SECRET,
    { expiresIn: "10m" }
  );

  await create2FAAuditLogModel({
    userId,
    userType: identity?.user_type,
    action: "QR_REGENERATED",
    deviceInfo,
    details: "QR code regenerated, new challenge created.",
  });

  return {
    qr_code_url: qrCodeUrl,
    secret,
    otpauth_url: otpauthUrl,
    otp_pending_token: setupToken,
    challenge_id: challenge.id,
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

  if (!profile.password_hash) {
    throw new Error("INVALID_PASSWORD");
  }
  const isValidPassword = await bcrypt.compare(password, profile.password_hash);
  if (!isValidPassword) {
    throw new Error("INVALID_PASSWORD");
  }

  const identity = await findIdentityByIdModel(userId);

  await updateProfile2FA(userId, null, false);

  // Cleanup all active sessions since 2FA was disabled (re-login required)
  await revokeAllUserSessionsService(userId);

  await createSecurityEventModel({
    userId,
    userType: identity?.user_type,
    eventType: "2FA_DISABLED",
    severity: "critical",
    deviceInfo: {},
    details: "Google Authenticator 2FA has been disabled by user.",
  });
  await create2FAAuditLogModel({
    userId,
    userType: identity?.user_type,
    action: "2FA_DISABLED",
    deviceInfo: {},
    details: "Google Authenticator 2FA has been disabled by user.",
  });

  return { message: "2FA has been disabled successfully. All sessions have been terminated." };
};

export const getUserSessionsService = async (userId: string) => {
  return await getUserActiveSessionsModel(userId);
};

export const revokeAllUserSessionsService = async (userId: string) => {
  await revokeAllUserRefreshTokensModel(userId);
  await invalidateAllUserSessionsModel(userId);
};

/**
 * Periodic cleanup of temporary records + retention-based pruning.
 *
 * Deletion timeline:
 *   - login_challenges : deleted on OTP success, or by cleanup after expiry (5 min)
 *   - login_sessions   : deleted permanently on logout, or by cleanup after expiry
 *   - refresh_tokens   : deleted permanently on logout/rotation, or by cleanup after expiry
 *   - audit_logs       : permanent, pruned after AUDIT_RETENTION_DAYS (90 days)
 *   - security_events  : long retention, pruned after SECURITY_EVENT_RETENTION_DAYS (365 days)
 */
export const cleanupExpiredSessionsAndTokens = async () => {
  const [
    expiredChallenges,
    expiredSessions,
    expiredTokens,
    oldAuditLogs,
    oldSecurityEvents,
    expiredUsedOtpTokens,
  ] = await Promise.all([
    cleanupExpiredChallenges(),
    cleanupExpiredSessions(),
    cleanupExpiredTokens(),
    cleanupOldAuditLogs(),
    cleanupOldSecurityEvents(),
    cleanupExpiredUsedOtpTokens(),
  ]);

  if (
    expiredChallenges +
      expiredSessions +
      expiredTokens +
      oldAuditLogs +
      oldSecurityEvents +
      expiredUsedOtpTokens >
    0
  ) {
    console.log(
      `🧹 Cleanup: ${expiredChallenges} challenges, ${expiredSessions} sessions, ${expiredTokens} tokens, ${oldAuditLogs} audit logs, ${oldSecurityEvents} security events, ${expiredUsedOtpTokens} expired used OTP tokens`
    );
  }
};
