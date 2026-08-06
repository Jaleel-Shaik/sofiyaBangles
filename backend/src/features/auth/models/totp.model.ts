import { db } from "../../../shared/config/firebase";
import {
  Profile,
  LoginSession,
  RefreshToken,
  OtpStatus,
  DeviceInformation,
  LoginChallenge,
  UserType,
  Platform,
} from "../../../shared/types";
import { findIdentityByIdModel, updateIdentityModel } from "../../../shared/models/identity.model";
import { v4 as uuidv4 } from "uuid";
import crypto from "crypto";
import { env } from "../../../shared/config/env";
import { toISTISO, nowISTISO } from "../../../shared/utils/datetime";

/**
 * Updates 2FA secret and status for an account (users/admins split aware)
 */
export const updateProfile2FA = async (
  userId: string,
  twoFaSecret: string | null,
  isEnabled: boolean
): Promise<void> => {
  const identity = await findIdentityByIdModel(userId);
  if (!identity) return;
  await updateIdentityModel(userId, identity.user_type, {
    two_fa_secret: twoFaSecret,
    is_2fa_enabled: isEnabled,
    two_fa_updated_at: twoFaSecret ? nowISTISO() : null,
  });
};

// ─── OTP brute-force tracking ──────────────────────────────

export const getOtpStatusModel = async (userId: string): Promise<OtpStatus | null> => {
  const doc = await db.collection("otp_status").doc(userId).get();
  if (!doc.exists) return null;
  return doc.data() as OtpStatus;
};

export const recordOtpFailureModel = async (userId: string): Promise<{ locked: boolean; lockedUntil?: string }> => {
  const statusRef = db.collection("otp_status").doc(userId);
  const doc = await statusRef.get();
  const now = new Date();

  let attempts = 1;
  let lockedUntil: string | null = null;

  if (doc.exists) {
    const data = doc.data() as OtpStatus;

    if (data.locked_until && new Date(data.locked_until) < now) {
      attempts = 1;
    } else {
      attempts = (data.failed_attempts || 0) + 1;
    }
  }

  if (attempts >= 5) {
    const lockTime = new Date(now.getTime() + 15 * 60000);
    lockedUntil = lockTime.toISOString();
  }

  await statusRef.set({
    user_id: userId,
    failed_attempts: attempts,
    locked_until: lockedUntil,
    last_failed_at: now.toISOString(),
  }, { merge: true });

  return { locked: attempts >= 5, lockedUntil: lockedUntil || undefined };
};

export const resetOtpFailuresModel = async (userId: string): Promise<void> => {
  await db.collection("otp_status").doc(userId).set({
    user_id: userId,
    failed_attempts: 0,
    locked_until: null,
    last_failed_at: null,
  }, { merge: true });
};

// ─── Replay attack protection ──────────────────────────────

export const isOtpTokenUsedModel = async (userId: string, token: string): Promise<boolean> => {
  const doc = await db.collection("used_otp_tokens").doc(`${userId}_${token}`).get();
  return doc.exists;
};

export const markOtpTokenAsUsedModel = async (userId: string, token: string): Promise<void> => {
  const expiresAt = new Date(Date.now() + 2 * 60000).toISOString();
  await db.collection("used_otp_tokens").doc(`${userId}_${token}`).set({
    user_id: userId,
    token,
    created_at: new Date().toISOString(),
    expires_at: expiresAt,
  });
};

// ─── Login Challenges (temporary, deleted after OTP/2FA) ──

/**
 * Creates a pending login challenge after the password is verified.
 * The challenge is temporary and is hard-deleted after verification
 * or by the periodic cleanup job once it expires.
 */
export const createLoginChallengeModel = async (data: {
  userId: string;
  userType: UserType;
  deviceInfo: DeviceInformation;
  correlationId?: string;
  ttlMs?: number;
}): Promise<LoginChallenge> => {
  const id = uuidv4();
  const now = new Date();
  const ttl = data.ttlMs || env.LOGIN_CHALLENGE_TTL_MS;

  const challenge: LoginChallenge = {
    id,
    user_id: data.userId,
    user_type: data.userType,
    otp_type: "TOTP",
    // One-time nonce binding this challenge to the issued pending token.
    otp_hash: crypto.createHash("sha256").update(uuidv4()).digest("hex"),
    status: "PENDING",
    expires_at: new Date(now.getTime() + ttl).toISOString(),
    created_at: now.toISOString(),
    verified_at: null,
    failed_attempts: 0,
    correlation_id: data.correlationId || "",
    ip_address: data.deviceInfo.ip_address || "",
    device_info: data.deviceInfo,
  };

  await db.collection("login_challenges").doc(id).set(challenge);
  return challenge;
};

export const findLoginChallengeModel = async (
  challengeId: string,
): Promise<LoginChallenge | null> => {
  const doc = await db.collection("login_challenges").doc(challengeId).get();
  if (!doc.exists) return null;
  return doc.data() as LoginChallenge;
};

export const updateLoginChallengeModel = async (
  challengeId: string,
  data: Partial<Pick<LoginChallenge, "status" | "verified_at" | "failed_attempts">>,
): Promise<void> => {
  await db.collection("login_challenges").doc(challengeId).update(data);
};

export const deleteLoginChallengeModel = async (
  challengeId: string,
): Promise<void> => {
  await db.collection("login_challenges").doc(challengeId).delete();
};

// ─── Refresh Tokens (temporary) ────────────────────────────

export const createRefreshTokenModel = async (
  userId: string,
  userType: UserType,
  rawRefreshToken: string,
  expiresInDays = 30,
  platform?: Platform
): Promise<RefreshToken> => {
  const id = uuidv4();
  const tokenHash = crypto.createHash("sha256").update(rawRefreshToken).digest("hex");
  const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString();

  const refreshTokenData: RefreshToken = {
    id,
    user_id: userId,
    user_type: userType,
    token_hash: tokenHash,
    is_revoked: false,
    created_at: new Date().toISOString(),
    expires_at: expiresAt,
    revoked_at: null,
    platform,
  };

  await db.collection("refresh_tokens").doc(id).set(refreshTokenData);
  return refreshTokenData;
};

export const findRefreshTokenModel = async (rawRefreshToken: string): Promise<RefreshToken | null> => {
  const tokenHash = crypto.createHash("sha256").update(rawRefreshToken).digest("hex");
  const snapshot = await db.collection("refresh_tokens").where("token_hash", "==", tokenHash).limit(1).get();
  if (snapshot.empty) return null;
  return snapshot.docs[0].data() as RefreshToken;
};

export const revokeRefreshTokenModel = async (tokenId: string): Promise<void> => {
  await db.collection("refresh_tokens").doc(tokenId).update({
    is_revoked: true,
    revoked_at: new Date().toISOString(),
  });
};

/** Hard-deletes a refresh token permanently (token rotation / logout). */
export const deleteRefreshTokenModel = async (tokenId: string): Promise<void> => {
  await db.collection("refresh_tokens").doc(tokenId).delete();
};

// ─── Login Sessions (temporary) ────────────────────────────

export const createLoginSessionModel = async (
  userId: string,
  userType: UserType,
  refreshTokenId: string,
  deviceInfo: DeviceInformation,
  expiresInDays = 7
): Promise<LoginSession> => {
  const id = uuidv4();
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString();

  const sessionData: LoginSession = {
    id,
    user_id: userId,
    user_type: userType,
    refresh_token_id: refreshTokenId,
    device_info: deviceInfo,
    is_active: true,
    login_at: now,
    last_active_at: now,
    logout_at: null,
    expires_at: expiresAt,
  };

  await db.collection("login_sessions").doc(id).set(sessionData);
  return sessionData;
};

export const findLoginSessionModel = async (
  sessionId: string,
): Promise<LoginSession | null> => {
  const doc = await db.collection("login_sessions").doc(sessionId).get();
  if (!doc.exists) return null;
  return doc.data() as LoginSession;
};

export const deactivateSessionModel = async (sessionId: string): Promise<void> => {
  await db.collection("login_sessions").doc(sessionId).update({
    is_active: false,
    logout_at: new Date().toISOString(),
    last_active_at: new Date().toISOString(),
  });
};

/** Hard-deletes a login session permanently (logout / cleanup). */
export const deleteLoginSessionModel = async (sessionId: string): Promise<void> => {
  await db.collection("login_sessions").doc(sessionId).delete();
};

export const revokeAllUserRefreshTokensModel = async (userId: string): Promise<void> => {
  const snapshot = await db.collection("refresh_tokens")
    .where("user_id", "==", userId)
    .get();

  const activeTokens = snapshot.docs.filter(
    doc => doc.data().is_revoked === false
  );

  if (activeTokens.length === 0) return;

  const batch = db.batch();
  activeTokens.forEach((doc) => {
    batch.update(doc.ref, { is_revoked: true, revoked_at: new Date().toISOString() });
  });
  await batch.commit();
};

export const invalidateAllUserSessionsModel = async (userId: string): Promise<void> => {
  const snapshot = await db.collection("login_sessions")
    .where("user_id", "==", userId)
    .get();

  const activeSessions = snapshot.docs.filter(
    doc => doc.data().is_active === true
  );

  if (activeSessions.length === 0) return;

  const batch = db.batch();
  activeSessions.forEach((doc) => {
    batch.update(doc.ref, {
      is_active: false,
      logout_at: new Date().toISOString(),
      last_active_at: new Date().toISOString(),
    });
  });
  await batch.commit();
};

export const getUserActiveSessionsModel = async (userId: string): Promise<LoginSession[]> => {
  const snapshot = await db.collection("login_sessions")
    .where("user_id", "==", userId)
    .get();

  const activeSessions = snapshot.docs
    .map(doc => doc.data() as LoginSession)
    .filter(session => session.is_active)
    .sort((a, b) => new Date(b.login_at).getTime() - new Date(a.login_at).getTime())
    .slice(0, 10);

  return activeSessions;
};

// ─── Cleanup (temporary records deleted permanently) ──────

/**
 * Hard-deletes expired login challenges. Challenges are temporary by design:
 * after the OTP/2FA step they are either deleted immediately on success or
 * removed by this job once expires_at passes.
 */
export const cleanupExpiredChallenges = async (): Promise<number> => {
  const now = new Date().toISOString();
  const snapshot = await db.collection("login_challenges")
    .where("expires_at", "<", now)
    .get();

  if (snapshot.empty) return 0;

  const batch = db.batch();
  snapshot.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
  return snapshot.size;
};

/**
 * Hard-deletes expired login sessions (temporary). A grace period can be
 * configured via SESSION_EXPIRY_GRACE_MS (0 by default = delete at expiry).
 */
export const cleanupExpiredSessions = async (): Promise<number> => {
  const cutoff = new Date(Date.now() - env.SESSION_EXPIRY_GRACE_MS).toISOString();
  const snapshot = await db.collection("login_sessions")
    .where("expires_at", "<", cutoff)
    .get();

  if (snapshot.empty) return 0;

  const batch = db.batch();
  snapshot.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
  return snapshot.size;
};

/**
 * Hard-deletes expired refresh tokens (temporary).
 */
export const cleanupExpiredTokens = async (): Promise<number> => {
  const now = new Date().toISOString();
  const snapshot = await db.collection("refresh_tokens")
    .where("expires_at", "<", now)
    .get();

  if (snapshot.empty) return 0;

  const batch = db.batch();
  snapshot.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
  return snapshot.size;
};

/**
 * Deletes audit logs older than the configured retention (default 90 days).
 */
export const cleanupOldAuditLogs = async (): Promise<number> => {
  const cutoff = toISTISO(new Date(Date.now() - env.AUDIT_RETENTION_DAYS * 24 * 60 * 60 * 1000))!;
  const snapshot = await db.collection("audit_logs")
    .where("created_at", "<", cutoff)
    .get();

  if (snapshot.empty) return 0;

  const batch = db.batch();
  snapshot.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
  return snapshot.size;
};

/**
 * Deletes security events older than the configured retention (default 365 days).
 */
export const cleanupOldSecurityEvents = async (): Promise<number> => {
  const cutoff = new Date(Date.now() - env.SECURITY_EVENT_RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const snapshot = await db.collection("security_events")
    .where("created_at", "<", cutoff)
    .get();

  if (snapshot.empty) return 0;

  const batch = db.batch();
  snapshot.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
  return snapshot.size;
};

// ─── 2FA Audit Log (session + API telemetry) ──────────────

export const create2FAAuditLogModel = async (data: {
  userId: string;
  userType?: UserType | null;
  action: "PASSWORD_SUCCESS" | "PASSWORD_FAILED" | "OTP_SUCCESS" | "OTP_FAILED" | "2FA_ENABLED" | "2FA_DISABLED" | "LOGOUT" | "ACCOUNT_LOCKED" | "TOKEN_REFRESHED" | "QR_REGENERATED";
  deviceInfo: DeviceInformation;
  details?: string;
  correlationId?: string | null;
  sessionId?: string | null;
}): Promise<void> => {
  const id = uuidv4();
  await db.collection("audit_logs").doc(id).set({
    id,
    actor_id: data.userId,
    user_type: data.userType || null,
    action: data.action,
    device_info: data.deviceInfo,
    details: data.details || null,
    correlation_id: data.correlationId || null,
    session_id: data.sessionId || null,
    ip_address: data.deviceInfo.ip_address || "",
    api_endpoint: null,
    api_error: null,
    status_code: null,
    created_at: new Date().toISOString(),
  });
};
