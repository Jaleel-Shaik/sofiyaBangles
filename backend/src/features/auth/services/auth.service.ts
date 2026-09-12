import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import {
  findIdentityByEmailDb,
  findIdentityByIdDb,
  insertIdentityDb,
  updateIdentityDb,
} from "../../../db/auth.db";
import {
  findProfileByEmailModel,
  setAdminOtpModel,
  getAdminOtpModel,
  deleteAdminOtpModel,
  updatePasswordHashModel,
  findIdentityByEmail,
} from "../models/auth.model";
import {
  createLoginChallengeModel,
  createRefreshTokenModel,
  createLoginSessionModel,
  create2FAAuditLogModel,
  updateProfile2FA,
} from "../models/totp.model";
import { findIdentityByIdModel } from "../../../shared/models/identity.model";
import { insertAuditLogDb } from "../../../db/audit.db";
import { generateToken } from "../../../shared/middlewares/auth.middleware";
import { RegisterInput, LoginInput } from "../validations/auth.validation";
import { cloudinaryStorage } from "../../../integrations/storage/cloudinary.adapter";
import { smsProvider } from "../../../integrations/sms/twilio.adapter";
import { auth as firebaseAuth } from "../../../shared/config/firebase";
import { env } from "../../../shared/config/env";
import { DeviceInformation, Platform } from "../../../shared/types";
import { assertPlatformAccess } from "../../../shared/utils/platform";
import { getRoleAuthConfig, requires2FAEnforcement } from "../../../shared/utils/auth-config";
import { generateTotpSecret, generateQrCodeDataUrl } from "../../../shared/utils/totp.utils";
import { encryptSecret } from "../../../shared/utils/crypto.utils";
import {
  ConflictError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  BadRequestError,
  RateLimitError,
} from "../../../core/errors/app.error";

// In-memory fallback for local dev without service account
const memoryOtps = new Map<string, { otp: string; expiresAt: string }>();
const otpCooldowns = new Map<string, number>();

export const registerService = async (input: RegisterInput) => {
  const existing = await findIdentityByEmailDb(input.email);
  if (existing) {
    throw new ConflictError("An account with this email already exists.");
  }

  const salt = await bcrypt.genSalt(12);
  const password_hash = await bcrypt.hash(input.password, salt);

  const identity = await insertIdentityDb({
    full_name: input.full_name,
    email: input.email,
    password_hash,
    phone: input.phone,
    role: input.role || "user",
  });
  const profile = identity.profile;

  const token = generateToken({
    userId: profile.id,
    email: profile.email,
    role: profile.role,
  });

  await insertAuditLogDb({
    actor_id: profile.id,
    action: "USER_REGISTERED",
    table_name: profile.role === "admin" || profile.role === "super_admin" ? "admins" : "users",
    record_id: profile.id,
  });

  const { password_hash: _, ...safeProfile } = profile;
  return { user: safeProfile, token };
};

export const loginService = async (input: LoginInput) => {
  const identity = await findIdentityByEmailDb(input.email);
  if (!identity) {
    throw new UnauthorizedError("Invalid email or password.");
  }
  const profile = identity.profile;

  if (!profile.is_active) {
    throw new ForbiddenError("Your account has been disabled. Contact support.");
  }

  if (!profile.password_hash) {
    throw new BadRequestError(
      "Password not set. Please complete registration via the mobile app first, or use 'Forgot Password'.",
      "PASSWORD_NOT_SET"
    );
  }

  const isValidPassword = await bcrypt.compare(input.password, profile.password_hash);
  if (!isValidPassword) {
    throw new UnauthorizedError("Invalid email or password.");
  }

  const token = generateToken({
    userId: profile.id,
    email: profile.email,
    role: profile.role,
  });

  const { password_hash: _, ...safeProfile } = profile;
  return { user: safeProfile, token };
};

export const getMeService = async (userId: string) => {
  const identity = await findIdentityByIdDb(userId);
  if (!identity) {
    throw new NotFoundError("User not found.");
  }
  return identity.profile;
};

export const updateProfileService = async (
  userId: string,
  data: { full_name?: string; phone?: string; avatar_url?: string; expo_push_token?: string }
) => {
  const identity = await findIdentityByIdDb(userId);
  if (!identity) throw new NotFoundError("User not found.");

  const updated = await updateIdentityDb(userId, identity.user_type, data);
  if (!updated) throw new NotFoundError("User not found.");

  const { password_hash, ...safeData } = updated;
  return safeData;
};

export const uploadAvatarService = async (userId: string, file: Express.Multer.File) => {
  if (!file) {
    throw new BadRequestError("No image file provided.");
  }

  const uploadResult = await cloudinaryStorage.uploadFile(file, {
    folder: "sofiya_bangles/avatars",
    transformation: [{ width: 300, height: 300, crop: "fill", gravity: "face" }],
  });

  return updateProfileService(userId, { avatar_url: uploadResult.url });
};

export const sendAdminOtpService = async (email: string, phoneFallback?: string) => {
  if (!email) {
    throw new BadRequestError("Email is required.");
  }

  const normalizedEmail = email.toLowerCase().trim();

  const lastRequest = otpCooldowns.get(normalizedEmail) || 0;
  if (Date.now() - lastRequest < 60000) {
    throw new RateLimitError("Please wait 60 seconds before requesting another OTP.");
  }

  let phoneNumber: string | undefined = undefined;

  try {
    const identity = await findIdentityByEmail(normalizedEmail);
    if (identity && identity.user_type === "admin") {
      phoneNumber = identity.profile.phone || undefined;
    }
  } catch (dbErr) {
    console.warn("⚠️ Firestore read error while verifying admin email:", dbErr);
  }

  if (!phoneNumber && process.env.NODE_ENV === "development" && phoneFallback) {
    phoneNumber = phoneFallback;
  }

  if (!phoneNumber) {
    throw new NotFoundError(
      "Admin profile with this email not found or missing registered phone number."
    );
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 5 * 60000).toISOString();

  try {
    await setAdminOtpModel(normalizedEmail, {
      otp,
      expiresAt,
      createdAt: new Date().toISOString(),
    });
  } catch {
    memoryOtps.set(normalizedEmail, { otp, expiresAt });
  }

  otpCooldowns.set(normalizedEmail, Date.now());

  await smsProvider.sendSms(phoneNumber, `Your Sofiya Bangles Admin Login OTP is: ${otp}`);

  console.log(`\n========================================`);
  console.log(`🔑 ADMIN OTP GENERATED FOR ${normalizedEmail}: ${otp}`);
  console.log(`========================================\n`);

  return { success: true, message: "OTP sent successfully." };
};

export const verifyAdminOtpService = async (email: string, otp: string) => {
  const normalizedEmail = email.toLowerCase().trim();
  const trimmedOtp = String(otp).trim();

  if (!normalizedEmail || !trimmedOtp) {
    throw new BadRequestError("Email and OTP are required.");
  }

  let firestoreOtpData: any = null;
  try {
    firestoreOtpData = await getAdminOtpModel(normalizedEmail);
  } catch {
    // Firestore read fallback
  }

  const memoryOtpData = memoryOtps.get(normalizedEmail);

  const isValid = (data: any) => {
    if (!data) return false;
    if (new Date(data.expiresAt) < new Date()) return false;
    return String(data.otp).trim() === trimmedOtp;
  };

  if (!isValid(firestoreOtpData) && !isValid(memoryOtpData)) {
    throw new BadRequestError("Invalid OTP.");
  }

  memoryOtps.delete(normalizedEmail);
  try {
    await deleteAdminOtpModel(normalizedEmail);
  } catch {
    // Ignore delete errors
  }

  let userData: any = null;
  let uid = normalizedEmail;
  try {
    const identity = await findIdentityByEmail(normalizedEmail);
    if (identity && identity.user_type === "admin") {
      userData = identity.profile;
      uid = identity.profile.id;
    }
  } catch (dbErr) {
    console.warn("⚠️ Firestore profile fetch failed:", dbErr);
  }

  if (!userData) {
    throw new ForbiddenError("Admin access denied. Profile not found or not an admin.");
  }

  let customToken = "dummy-fallback-token-for-dev";
  try {
    customToken = await firebaseAuth.createCustomToken(uid, { role: "admin" });
  } catch {
    // Fallback in dev
  }

  return { customToken, user: userData };
};

export const firebaseLoginService = async (
  firebaseToken: string,
  deviceInfo: DeviceInformation,
  platform: Platform
) => {
  let decodedToken: any;
  try {
    decodedToken = await firebaseAuth.verifyIdToken(firebaseToken);
  } catch {
    throw new UnauthorizedError("Invalid or expired Firebase token.");
  }

  const uid = decodedToken.uid;
  const email = decodedToken.email || "";

  const identity = await findIdentityByIdModel(uid);
  if (!identity) {
    throw new NotFoundError("User profile not found. Please register first.");
  }
  const profile = identity.profile;
  const userType = identity.user_type;

  if (!profile.is_active) {
    throw new ForbiddenError("Your account has been disabled.");
  }

  assertPlatformAccess(profile.role, platform);

  const has2FAEnabled = profile.is_2fa_enabled && profile.two_fa_secret;
  const roleRequires2FA = requires2FAEnforcement(profile.role);

  if (has2FAEnabled) {
    const roleConfig = getRoleAuthConfig(profile.role);
    const challenge = await createLoginChallengeModel({ userId: uid, userType, deviceInfo });
    const otpPendingToken = jwt.sign(
      { userId: uid, email, role: profile.role, userType, type: "OTP_PENDING", challengeId: challenge.id, platform },
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
  }

  if (roleRequires2FA) {
    const roleConfig = getRoleAuthConfig(profile.role);
    const result = generateTotpSecret(email);
    const secret = result.secret;
    const encryptedSecret = encryptSecret(secret);
    const qrCodeUrl = await generateQrCodeDataUrl(result.otpauthUrl);
    await updateProfile2FA(uid, encryptedSecret, false);

    const challenge = await createLoginChallengeModel({ userId: uid, userType, deviceInfo });
    const setupToken = jwt.sign(
      { userId: uid, email, role: profile.role, userType, type: "2FA_SETUP", challengeId: challenge.id, platform },
      env.JWT_SECRET,
      { expiresIn: roleConfig.qrSetupExpiry } as jwt.SignOptions
    );

    return {
      require_otp: true,
      setup_required: true,
      qr_code_url: qrCodeUrl,
      secret,
      otpauth_url: `otpauth://totp/${encodeURIComponent("Sofiya Bangles")}:${encodeURIComponent(email)}?secret=${secret}&issuer=${encodeURIComponent("Sofiya Bangles")}&algorithm=SHA1&digits=6&period=30`,
      otp_pending_token: setupToken,
      challenge_id: challenge.id,
      message: "Scan QR code using Google Authenticator.",
    };
  }

  const correlationId = "AUTH-" + uuidv4();
  await create2FAAuditLogModel({
    userId: uid,
    userType,
    action: "PASSWORD_SUCCESS",
    deviceInfo,
    details: "Firebase Auth login",
    correlationId,
  });

  const roleConfig = getRoleAuthConfig(profile.role);
  const accessToken = jwt.sign(
    { userId: uid, email, role: profile.role, userType, platform },
    env.JWT_SECRET,
    { expiresIn: roleConfig.accessTokenExpiry } as jwt.SignOptions
  );

  const rawRefreshToken = uuidv4();
  const refreshTokenRecord = await createRefreshTokenModel(
    uid,
    userType,
    rawRefreshToken,
    roleConfig.refreshTokenExpiryDays,
    platform
  );
  const session = await createLoginSessionModel(
    uid,
    userType,
    refreshTokenRecord.id,
    deviceInfo,
    roleConfig.sessionExpiryDays
  );

  await insertAuditLogDb({
    actor_id: uid,
    user_type: userType,
    action: "LOGIN_SUCCESS",
    table_name: "login_sessions",
    record_id: session.id,
    session_id: session.id,
    correlation_id: correlationId,
    ip_address: deviceInfo.ip_address || "",
  });

  const { password_hash, two_fa_secret, ...safeUser } = profile;

  return {
    user: { ...safeUser, is_2fa_enabled: false },
    access_token: accessToken,
    refresh_token: rawRefreshToken,
    session_id: session.id,
    expires_in: roleConfig.accessTokenExpiry,
    message: "Login successful.",
  };
};

export const setPasswordService = async (email: string, password: string) => {
  if (!email || !password) {
    throw new BadRequestError("Email and password are required.");
  }

  const normalizedEmail = email.toLowerCase().trim();
  const profile = await findProfileByEmailModel(normalizedEmail);
  if (!profile) {
    throw new NotFoundError("User profile not found.");
  }

  const salt = await bcrypt.genSalt(12);
  const password_hash = await bcrypt.hash(password, salt);

  const identity = await findIdentityByIdModel(profile.id);
  await updatePasswordHashModel(profile.id, identity?.collection || "users", password_hash);

  return { success: true, message: "Password hash stored successfully." };
};
