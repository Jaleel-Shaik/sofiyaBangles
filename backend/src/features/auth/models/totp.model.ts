import { db } from "../../../shared/config/firebase";
import { Profile, LoginSession, RefreshToken, OtpStatus, DeviceInformation } from "../../../shared/types";
import { v4 as uuidv4 } from "uuid";
import crypto from "crypto";

/**
 * Updates 2FA secret and status for a profile
 */
export const updateProfile2FA = async (
  userId: string,
  twoFaSecret: string | null,
  isEnabled: boolean
): Promise<void> => {
  await db.collection("profiles").doc(userId).update({
    two_fa_secret: twoFaSecret,
    is_2fa_enabled: isEnabled,
    updated_at: new Date().toISOString(),
  });
};

/**
 * Gets OTP status document for brute-force tracking
 */
export const getOtpStatusModel = async (userId: string): Promise<OtpStatus | null> => {
  const doc = await db.collection("otp_status").doc(userId).get();
  if (!doc.exists) return null;
  return doc.data() as OtpStatus;
};

/**
 * Records an OTP attempt failure and handles 15-minute lockout after 5 failures
 */
export const recordOtpFailureModel = async (userId: string): Promise<{ locked: boolean; lockedUntil?: string }> => {
  const statusRef = db.collection("otp_status").doc(userId);
  const doc = await statusRef.get();
  const now = new Date();

  let attempts = 1;
  let lockedUntil: string | null = null;

  if (doc.exists) {
    const data = doc.data() as OtpStatus;
    
    // Check if previous lock expired, reset if expired
    if (data.locked_until && new Date(data.locked_until) < now) {
      attempts = 1;
    } else {
      attempts = (data.failed_attempts || 0) + 1;
    }
  }

  if (attempts >= 5) {
    const lockTime = new Date(now.getTime() + 15 * 60000); // 15 minutes lockout
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

/**
 * Resets OTP failure counter after successful verification
 */
export const resetOtpFailuresModel = async (userId: string): Promise<void> => {
  await db.collection("otp_status").doc(userId).set({
    user_id: userId,
    failed_attempts: 0,
    locked_until: null,
    last_failed_at: null,
  }, { merge: true });
};

/**
 * Replay Attack Protection: Tracks used TOTP tokens within window
 */
export const isOtpTokenUsedModel = async (userId: string, token: string): Promise<boolean> => {
  const doc = await db.collection("used_otp_tokens").doc(`${userId}_${token}`).get();
  return doc.exists;
};

export const markOtpTokenAsUsedModel = async (userId: string, token: string): Promise<void> => {
  // Store used token with 2-minute TTL expiry
  const expiresAt = new Date(Date.now() + 2 * 60000).toISOString();
  await db.collection("used_otp_tokens").doc(`${userId}_${token}`).set({
    user_id: userId,
    token,
    created_at: new Date().toISOString(),
    expires_at: expiresAt,
  });
};

/**
 * Saves a new Refresh Token
 */
export const createRefreshTokenModel = async (
  userId: string,
  rawRefreshToken: string,
  expiresInDays = 30
): Promise<RefreshToken> => {
  const id = uuidv4();
  const tokenHash = crypto.createHash("sha256").update(rawRefreshToken).digest("hex");
  const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString();

  const refreshTokenData: RefreshToken = {
    id,
    user_id: userId,
    token_hash: tokenHash,
    is_revoked: false,
    created_at: new Date().toISOString(),
    expires_at: expiresAt,
  };

  await db.collection("refresh_tokens").doc(id).set(refreshTokenData);
  return refreshTokenData;
};

/**
 * Finds a refresh token by raw token
 */
export const findRefreshTokenModel = async (rawRefreshToken: string): Promise<RefreshToken | null> => {
  const tokenHash = crypto.createHash("sha256").update(rawRefreshToken).digest("hex");
  const snapshot = await db.collection("refresh_tokens").where("token_hash", "==", tokenHash).limit(1).get();
  if (snapshot.empty) return null;
  return snapshot.docs[0].data() as RefreshToken;
};

/**
 * Revokes a refresh token (Token Rotation / Logout)
 */
export const revokeRefreshTokenModel = async (tokenId: string): Promise<void> => {
  await db.collection("refresh_tokens").doc(tokenId).update({
    is_revoked: true,
  });
};

/**
 * Creates a login session record
 */
export const createLoginSessionModel = async (
  userId: string,
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
    refresh_token_id: refreshTokenId,
    device_info: deviceInfo,
    is_active: true,
    login_at: now,
    last_active_at: now,
    expires_at: expiresAt,
  };

  await db.collection("login_sessions").doc(id).set(sessionData);
  return sessionData;
};

/**
 * Deactivates a login session (Logout)
 */
export const invalidateSessionModel = async (sessionId: string): Promise<void> => {
  await db.collection("login_sessions").doc(sessionId).update({
    is_active: false,
    last_active_at: new Date().toISOString(),
  });
};

/**
 * Revokes all refresh tokens for a user (security event, 2FA disable)
 *
 * Uses single-field query + in-memory filter to avoid requiring
 * a composite Firestore index on (user_id, is_revoked).
 */
export const revokeAllUserRefreshTokensModel = async (userId: string): Promise<void> => {
  const snapshot = await db.collection("refresh_tokens")
    .where("user_id", "==", userId)
    .get();
  
  // Filter in-memory to avoid composite index requirement
  const activeTokens = snapshot.docs.filter(
    doc => doc.data().is_revoked === false
  );
  
  if (activeTokens.length === 0) return;
  
  const batch = db.batch();
  activeTokens.forEach((doc) => {
    batch.update(doc.ref, { is_revoked: true });
  });
  await batch.commit();
};

/**
 * Invalidates all active sessions for a user
 *
 * Uses single-field query + in-memory filter to avoid requiring
 * a composite Firestore index on (user_id, is_active).
 */
export const invalidateAllUserSessionsModel = async (userId: string): Promise<void> => {
  const snapshot = await db.collection("login_sessions")
    .where("user_id", "==", userId)
    .get();
  
  // Filter in-memory to avoid composite index requirement
  const activeSessions = snapshot.docs.filter(
    doc => doc.data().is_active === true
  );
  
  if (activeSessions.length === 0) return;
  
  const batch = db.batch();
  activeSessions.forEach((doc) => {
    batch.update(doc.ref, {
      is_active: false,
      last_active_at: new Date().toISOString(),
    });
  });
  await batch.commit();
};

/**
 * Get active sessions for a user
 *
 * Uses single-field query + in-memory filtering/sorting to avoid
 * requiring a composite Firestore index on (user_id, is_active, login_at).
 */
export const getUserActiveSessionsModel = async (userId: string): Promise<LoginSession[]> => {
  const snapshot = await db.collection("login_sessions")
    .where("user_id", "==", userId)
    .get();
  
  // Filter in-memory for active sessions and sort by login_at desc
  const activeSessions = snapshot.docs
    .map(doc => doc.data() as LoginSession)
    .filter(session => session.is_active)
    .sort((a, b) => new Date(b.login_at).getTime() - new Date(a.login_at).getTime())
    .slice(0, 10);
  
  return activeSessions;
};

/**
 * Clean up expired sessions
 *
 * Uses single-field query on expires_at + in-memory filter for is_active
 * to avoid requiring a composite Firestore index on (expires_at, is_active).
 * Firestore auto-creates a single-field index for expires_at.
 */
export const cleanupExpiredSessions = async (): Promise<number> => {
  const now = new Date().toISOString();
  const snapshot = await db.collection("login_sessions")
    .where("expires_at", "<", now)
    .get();
  
  if (snapshot.empty) return 0;
  
  // Filter in-memory for active sessions only
  const expiredActive = snapshot.docs.filter(
    doc => doc.data().is_active === true
  );
  
  if (expiredActive.length === 0) return 0;
  
  const batch = db.batch();
  expiredActive.forEach((doc) => {
    batch.update(doc.ref, { is_active: false });
  });
  await batch.commit();
  return expiredActive.length;
};

/**
 * Clean up expired/revoked refresh tokens
 *
 * Uses single-field query on expires_at + in-memory filter for is_revoked
 * to avoid requiring a composite Firestore index on (expires_at, is_revoked).
 * Firestore auto-creates a single-field index for expires_at.
 */
export const cleanupExpiredTokens = async (): Promise<number> => {
  const now = new Date().toISOString();
  const snapshot = await db.collection("refresh_tokens")
    .where("expires_at", "<", now)
    .get();
  
  if (snapshot.empty) return 0;
  
  // Filter in-memory for non-revoked tokens only
  const expiredNonRevoked = snapshot.docs.filter(
    doc => doc.data().is_revoked === false
  );
  
  if (expiredNonRevoked.length === 0) return 0;
  
  const batch = db.batch();
  expiredNonRevoked.forEach((doc) => {
    batch.update(doc.ref, { is_revoked: true });
  });
  await batch.commit();
  return expiredNonRevoked.length;
};

/**
 * Clean up old audit logs (keep last 90 days)
 */
export const cleanupOldAuditLogs = async (): Promise<number> => {
  const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
  const snapshot = await db.collection("audit_logs")
    .where("created_at", "<", cutoff)
    .get();
  
  if (snapshot.empty) return 0;
  
  const batch = db.batch();
  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });
  await batch.commit();
  return snapshot.size;
};

/**
 * Creates an Audit Log record for Security and Compliance
 */
export const create2FAAuditLogModel = async (data: {
  userId: string;
  action: "PASSWORD_SUCCESS" | "PASSWORD_FAILED" | "OTP_SUCCESS" | "OTP_FAILED" | "2FA_ENABLED" | "2FA_DISABLED" | "LOGOUT" | "ACCOUNT_LOCKED" | "TOKEN_REFRESHED" | "QR_REGENERATED";
  deviceInfo: DeviceInformation;
  details?: string;
}): Promise<void> => {
  const id = uuidv4();
  await db.collection("audit_logs").doc(id).set({
    id,
    actor_id: data.userId,
    action: data.action,
    device_info: data.deviceInfo,
    details: data.details || null,
    created_at: new Date().toISOString(),
  });
};
