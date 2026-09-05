import { Request, Response } from "express";
import { AuthRequest, DeviceInformation } from "../../../shared/types";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db, auth as firebaseAuth } from "../../../shared/config/firebase";
import { env } from "../../../shared/config/env";
import { getRoleAuthConfig, requires2FAEnforcement } from "../../../shared/utils/auth-config";
import { nowISTISO } from "../../../shared/utils/datetime";
import { assertPlatformAccess, resolvePlatform } from "../../../shared/utils/platform";
import {
  registerService,
  getMeService,
  updateProfileService,
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
import { findProfileByEmailModel, findProfileByIdModel } from "../models/auth.model";
import { findIdentityByIdModel } from "../../../shared/models/identity.model";
import { createAuditLogModel } from "../../../shared/models/audit.model";
import {
  updateProfile2FA,
  createRefreshTokenModel,
  createLoginSessionModel,
  create2FAAuditLogModel,
} from "../models/totp.model";

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

export const register = async (req: AuthRequest, res: Response) => {
  try {
    const result = await registerService(req.body);

    res.status(201).json({
      success: true,
      data: result,
      message: "Registration successful.",
    });
  } catch (error: any) {
    if (error.message === "EMAIL_EXISTS") {
      res.status(409).json({
        success: false,
        message: "An account with this email already exists.",
      });
      return;
    }
    console.error("Register error:", error);
    res.status(500).json({
      success: false,
      message: "Registration failed. Please try again.",
    });
  }
};

export const login = async (req: AuthRequest, res: Response) => {
  try {
    const deviceInfo = extractDeviceInfo(req);
    const platform = resolvePlatform(req.headers["x-client-type"] as string | undefined);
    const result = await initiateLoginService(req.body.email, req.body.password, deviceInfo, platform);
    console.log("Login result:", result);

    res.json({
      success: true,
      data: result,
      message: (result as any).message || "Login successful.",
    });

  } catch (error: any) {
    if (error.message === "PLATFORM_ACCESS_DENIED_USER_WEB") {
      res.status(403).json({
        success: false,
        code: "PLATFORM_ACCESS_DENIED_USER_WEB",
        message: "This account does not have access to the web portal.",
      });
      return;
    }
    if (error.message === "PLATFORM_ACCESS_DENIED_SUPER_ADMIN_MOBILE") {
      res.status(403).json({
        success: false,
        code: "PLATFORM_ACCESS_DENIED_SUPER_ADMIN_MOBILE",
        message: "Super Admin accounts can only access the web portal.",
      });
      return;
    }
    if (error.message === "PLATFORM_ACCESS_DENIED") {
      res.status(403).json({
        success: false,
        code: "PLATFORM_ACCESS_DENIED",
        message: "Access denied for this platform.",
      });
      return;
    }
    if (error.message === "INVALID_CREDENTIALS") {
      res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
      return;
    }
    if (error.message === "PASSWORD_NOT_SET") {
      res.status(400).json({
        success: false,
        message: "Password not set. Please complete registration via the mobile app first, or use 'Forgot Password'.",
        code: "PASSWORD_NOT_SET",
      });
      return;
    }
    if (error.message === "ACCOUNT_DISABLED") {
      res.status(403).json({
        success: false,
        message: "Your account has been disabled. Contact support.",
      });
      return;
    }
    if (error.message === "ACCOUNT_LOCKED_15_MINUTES") {
      res.status(429).json({
        success: false,
        message: "Account locked due to 5 consecutive wrong OTP attempts. Try again in 15 minutes.",
      });
      return;
    }
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      message: "Login failed. Please try again.",
    });
  }
};

export const getMe = async (req: AuthRequest, res: Response) => {
  try {
    const user = await getMeService(req.user!.userId);

    res.json({
      success: true,
      data: user,
    });
  } catch (error: any) {
    if (error.message === "USER_NOT_FOUND") {
      res.status(404).json({
        success: false,
        message: "User not found.",
      });
      return;
    }
    console.error("GetMe error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch profile.",
    });
  }
};

export const updateProfile = async (req: AuthRequest, res: Response) => {
  try {
    const user = await updateProfileService(req.user!.userId, req.body);

    res.json({
      success: true,
      data: user,
      message: "Profile updated successfully.",
    });
  } catch (error: any) {
    console.error("UpdateProfile error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update profile.",
    });
  }
};

export const uploadAvatar = async (req: AuthRequest, res: Response) => {
  try {
    const file = req.file as Express.Multer.File;
    if (!file) {
      res.status(400).json({
        success: false,
        message: "No image file provided.",
      });
      return;
    }

    const avatarUrl = await uploadToCloudinaryProfile(file);

    const user = await updateProfileService(req.user!.userId, { avatar_url: avatarUrl });

    res.json({
      success: true,
      data: user,
      message: "Avatar uploaded successfully.",
    });
  } catch (error: any) {
    console.error("UploadAvatar error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to upload avatar.",
    });
  }
};

async function uploadToCloudinaryProfile(file: Express.Multer.File): Promise<string> {
  const { v2: cloudinary } = require("cloudinary");
  const streamifier = require("streamifier");
  const { env } = require("../../../shared/config/env");

  cloudinary.config({
    cloud_name: env.CLOUD_NAME,
    api_key: env.CLOUD_API_KEY,
    api_secret: env.CLOUD_API_SECRET,
  });

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "sofiya_bangles/avatars",
        transformation: [{ width: 300, height: 300, crop: "fill", gravity: "face" }],
      },
      (error: any, result: any) => {
        if (result) {
          resolve(result.secure_url);
        } else {
          reject(error);
        }
      }
    );

    streamifier.createReadStream(file.buffer).pipe(stream);
  });
}

// In-memory fallback for local dev without service account
const memoryOtps = new Map<string, { otp: string, expiresAt: string }>();
const otpCooldowns = new Map<string, number>();

export const sendOtp = async (req: AuthRequest, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ success: false, message: "Email is required." });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Cooldown check (60 seconds)
    const lastRequest = otpCooldowns.get(normalizedEmail) || 0;
    if (Date.now() - lastRequest < 60000) {
      res.status(429).json({
        success: false,
        message: "Please wait 60 seconds before requesting another OTP.",
      });
      return;
    }

    let phoneNumber: string | undefined = undefined;

    // Verify user is an admin in the admins collection
    try {
      const snapshot = await db.collection("admins")
        .where("email", "==", normalizedEmail)
        .limit(1)
        .get();
      if (!snapshot.empty) {
        phoneNumber = snapshot.docs[0].data().phone;
      }
    } catch (dbErr) {
      console.log("⚠️ Firestore read error while verifying admin email:", dbErr);
    }

    if (!phoneNumber && process.env.NODE_ENV === "development" && req.body.phone) {
      // In dev mode ONLY, allow fallback phone for testing
      phoneNumber = req.body.phone;
    }

    if (!phoneNumber) {
      res.status(404).json({
        success: false,
        message: "Admin profile with this email not found or missing registered phone number.",
      });
      return;
    }

    // Generate a 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60000).toISOString(); // 5 minutes

    // Store OTP
    try {
      await db.collection("admin_otps").doc(normalizedEmail).set({
        otp,
        expiresAt,
        createdAt: new Date().toISOString()
      });
    } catch (dbErr) {
      console.log("⚠️ Firestore unavailable. Storing OTP in memory.");
      memoryOtps.set(normalizedEmail, { otp, expiresAt });
    }

    otpCooldowns.set(normalizedEmail, Date.now());

    // Send via Twilio
    const { env } = require("../../../shared/config/env");
    
    if (env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN && env.TWILIO_PHONE_NUMBER) {
      try {
        const twilio = require('twilio');
        const client = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
        
        const formattedNumber = phoneNumber.startsWith('+') ? phoneNumber : `+91${phoneNumber}`;

        await client.messages.create({
          body: `Your Sofiya Bangles Admin Login OTP is: ${otp}`,
          from: env.TWILIO_PHONE_NUMBER,
          to: formattedNumber
        });
        console.log(`✅ SMS OTP sent to ${formattedNumber}`);
      } catch (smsError) {
        console.error("❌ Failed to send SMS via Twilio:", smsError);
      }
    } else {
      console.log(`⚠️ Twilio not configured. Printing OTP to console instead.`);
    }

    console.log(`\n========================================`);
    console.log(`🔑 ADMIN OTP GENERATED FOR ${normalizedEmail}`);
    console.log(`=> ${otp} <=`);
    console.log(`========================================\n`);

    res.json({ success: true, message: "OTP sent successfully." });
  } catch (error: any) {
    console.error("Send OTP error:", error);
    res.status(500).json({ success: false, message: "Failed to send OTP." });
  }
};

export const verifyOtp = async (req: AuthRequest, res: Response) => {
  try {
    const email = req.body.email?.toLowerCase().trim();
    const otp = String(req.body.otp).trim();
    
    if (!email || !otp) {
      res.status(400).json({ success: false, message: "Email and OTP are required." });
      return;
    }

    let firestoreOtpData: any = null;
    let docRef: any = null;

    // 1. Try to read from Firestore safely
    try {
      docRef = db.collection("admin_otps").doc(email);
      const doc = await docRef.get();
      if (doc.exists) {
        firestoreOtpData = doc.data();
      }
    } catch (dbErr) {
      console.log("⚠️ Firestore read failed, ignoring.");
    }

    // 2. Read from memory
    const memoryOtpData = memoryOtps.get(email);

    // 3. Validation helper
    const isValid = (data: any) => {
      if (!data) return false;
      if (new Date(data.expiresAt) < new Date()) return false;
      return String(data.otp).trim() === otp;
    };

    // 4. Check if either match
    const isValidInFirestore = isValid(firestoreOtpData);
    const isValidInMemory = isValid(memoryOtpData);

    if (!isValidInFirestore && !isValidInMemory) {
      res.status(400).json({ success: false, message: "Invalid OTP." });
      return;
    }

    // 5. Clean up OTPs safely
    memoryOtps.delete(email);
    try {
      if (docRef) await docRef.delete();
    } catch (dbErr) {
      console.log("⚠️ Firestore delete failed, ignored.");
    }

    // Fetch admin account from the admins collection
    let userData: any = null;
    let uid = email;
    try {
      const profileSnapshot = await db.collection("admins")
        .where("email", "==", email)
        .limit(1)
        .get();
      if (!profileSnapshot.empty) {
        userData = profileSnapshot.docs[0].data();
        uid = profileSnapshot.docs[0].id;
      }
    } catch (dbErr) {
      console.log("⚠️ Firestore profile fetch failed:", dbErr);
    }

    if (!userData) {
      res.status(403).json({
        success: false,
        message: "Admin access denied. Profile not found or not an admin.",
      });
      return;
    }

    // Create a custom token for the admin
    let customToken = "dummy-fallback-token-for-dev";
    try {
      customToken = await firebaseAuth.createCustomToken(uid, { role: "admin" });
    } catch (tokenErr) {
      console.log("⚠️ createCustomToken failed (likely missing service account). Using dummy token.");
    }

    res.json({ success: true, customToken, user: userData });
  } catch (error: any) {
    console.error("Verify OTP error:", error);
    res.status(500).json({ success: false, message: "Failed to verify OTP." });
  }
};

/**
 * TOTP 2FA Verification Endpoint (Step 2)
 */
export const verify2FAController = async (req: AuthRequest, res: Response) => {
  try {
    const {
      otp_pending_token,
      otp_code,
      challenge_id,
      challengeId,
      email,
      otp,
      useBackupCode,
      use_backup_code,
    } = req.body;

    const resolvedChallengeId = challengeId || challenge_id;
    const resolvedCode = (otp || otp_code || "").trim();
    const resolvedBackup = Boolean(useBackupCode ?? use_backup_code);
    const deviceInfo = extractDeviceInfo(req);
    const platform = resolvePlatform(req.headers["x-client-type"] as string | undefined);

    const result = await verify2FAOtpService(
      otp_pending_token,
      resolvedCode,
      deviceInfo,
      platform,
      resolvedChallengeId,
      email,
      resolvedBackup
    );

    res.json({
      success: true,
      data: result,
      message: resolvedBackup
        ? "Backup recovery code verified successfully. User authenticated."
        : "2FA Verification successful. User authenticated.",
    });

  } catch (error: any) {
    if (error.message === "INVALID_BACKUP_CODE") {
      res.status(400).json({
        success: false,
        code: "INVALID_BACKUP_CODE",
        message: "Invalid or already used backup recovery code.",
      });
      return;
    }
    if (error.message === "PLATFORM_ACCESS_DENIED_USER_WEB") {
      res.status(403).json({
        success: false,
        code: "PLATFORM_ACCESS_DENIED_USER_WEB",
        message: "This account does not have access to the web portal.",
      });
      return;
    }
    if (error.message === "PLATFORM_ACCESS_DENIED_SUPER_ADMIN_MOBILE") {
      res.status(403).json({
        success: false,
        code: "PLATFORM_ACCESS_DENIED_SUPER_ADMIN_MOBILE",
        message: "Super Admin accounts can only access the web portal.",
      });
      return;
    }
    if (error.message === "PLATFORM_ACCESS_DENIED") {
      res.status(403).json({
        success: false,
        code: "PLATFORM_ACCESS_DENIED",
        message: "Access denied for this platform.",
      });
      return;
    }
    if (error.message === "EXPIRED_OR_INVALID_PENDING_TOKEN") {
      res.status(401).json({
        success: false,
        code: "EXPIRED_OR_INVALID_PENDING_TOKEN",
        message: "OTP session has expired or is invalid. Please log in again.",
      });
      return;
    }
    if (error.message === "ACCOUNT_LOCKED_15_MINUTES") {
      res.status(429).json({
        success: false,
        code: "ACCOUNT_LOCKED_15_MINUTES",
        message: "Account locked due to 5 consecutive failed OTP attempts. Please try again in 15 minutes.",
      });
      return;
    }
    if (error.message === "OTP_ALREADY_USED") {
      res.status(400).json({
        success: false,
        code: "OTP_ALREADY_USED",
        message: "This OTP code has already been used. Please wait 30 seconds for the next code.",
      });
      return;
    }
    if (error.message === "INVALID_OTP") {
      res.status(400).json({
        success: false,
        code: "INVALID_OTP",
        message: "Invalid Google Authenticator OTP code. Please check your device clock and try again.",
      });
      return;
    }
    if (error.message === "INVALID_PENDING_TOKEN_TYPE") {
      res.status(403).json({
        success: false,
        code: "INVALID_PENDING_TOKEN_TYPE",
        message: "Invalid token type for this operation.",
      });
      return;
    }
    if (error.message === "USER_NOT_FOUND") {
      res.status(404).json({
        success: false,
        code: "USER_NOT_FOUND",
        message: "User account not found.",
      });
      return;
    }
    if (error.message === "2FA_SECRET_NOT_FOUND") {
      res.status(400).json({
        success: false,
        code: "2FA_SECRET_NOT_FOUND",
        message: "2FA secret not found. Please log in again.",
      });
      return;
    }
    if (error.message === "FAILED_TO_DECRYPT_2FA_SECRET") {
      res.status(400).json({
        success: false,
        code: "FAILED_TO_DECRYPT_2FA_SECRET",
        message: "Failed to decrypt 2FA secret with configured keys.",
      });
      return;
    }
    console.error("Verify 2FA controller error:", error);
    res.status(500).json({
      success: false,
      code: "INTERNAL_ERROR",
      message: "Failed to verify 2FA OTP.",
    });
  }
};

/**
 * Refresh Token Rotation Endpoint
 */
export const refreshTokenController = async (req: AuthRequest, res: Response) => {
  try {
    const { refresh_token } = req.body;
    const deviceInfo = extractDeviceInfo(req);
    const platform = resolvePlatform(req.headers["x-client-type"] as string | undefined);

    const result = await rotateRefreshTokenService(refresh_token, platform, deviceInfo);

    res.json({
      success: true,
      data: result,
      message: "Tokens rotated successfully.",
    });
  } catch (error: any) {
    if (
      error.message === "PLATFORM_ACCESS_DENIED_USER_WEB" ||
      error.message === "PLATFORM_ACCESS_DENIED_SUPER_ADMIN_MOBILE" ||
      error.message === "PLATFORM_ACCESS_DENIED"
    ) {
      res.status(403).json({
        success: false,
        code: error.message,
        message: "Access denied for this platform.",
      });
      return;
    }
    res.status(401).json({
      success: false,
      message: "Invalid or expired refresh token. Please login again.",
    });
  }
};

/**
 * Logout Endpoint (Revokes Refresh Token & Session)
 */
export const logoutController = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId || "";
    const { refresh_token, session_id } = req.body;
    const deviceInfo = extractDeviceInfo(req);

    await logoutService(userId, refresh_token, session_id, deviceInfo);

    res.json({
      success: true,
      message: "Logged out successfully.",
    });
  } catch (error: any) {
    console.error("Logout error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to process logout.",
    });
  }
};

/**
 * Regenerate QR Code Endpoint (for expired QR or re-setup)
 * User is identified via the otp_pending_token (not JWT auth) since
 * the user hasn't completed 2FA verification yet.
 */
export const regenerateQRController = async (req: AuthRequest, res: Response) => {
  try {
    const { otp_pending_token } = req.body;

    // Decode the otp_pending_token to get userId and email
    let decoded: any;
    try {
      decoded = jwt.verify(otp_pending_token, env.JWT_SECRET);
    } catch (err) {
      res.status(401).json({
        success: false,
        code: "EXPIRED_OR_INVALID_PENDING_TOKEN",
        message: "Invalid or expired OTP pending token. Please login again.",
      });
      return;
    }

    if (decoded.type !== "2FA_SETUP") {
      res.status(403).json({
        success: false,
        code: "INVALID_TOKEN_TYPE",
        message: "Invalid token type for QR regeneration.",
      });
      return;
    }

    const userId = decoded.userId;
    const email = decoded.email;
    const oldChallengeId = decoded.challengeId;
    const deviceInfo = extractDeviceInfo(req);

    const result = await regenerateQRService(userId, email, deviceInfo, oldChallengeId);

    res.json({
      success: true,
      data: result,
      message: "QR code regenerated successfully.",
    });
  } catch (error: any) {
    if (error.message === "2FA_ALREADY_ENABLED") {
      res.status(400).json({
        success: false,
        message: "2FA is already enabled. Disable it first to regenerate QR.",
      });
      return;
    }
    if (error.message === "USER_NOT_FOUND") {
      res.status(404).json({
        success: false,
        message: "User not found.",
      });
      return;
    }
    console.error("Regenerate QR error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to regenerate QR code.",
    });
  }
};

/**
 * Disable 2FA Endpoint (requires current password)
 */
export const disable2FAController = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { password } = req.body;

    if (!password) {
      res.status(400).json({
        success: false,
        message: "Current password is required to disable 2FA.",
      });
      return;
    }

    const result = await disable2FAService(userId, password);

    res.json({
      success: true,
      message: result.message,
    });
  } catch (error: any) {
    if (error.message === "INVALID_PASSWORD") {
      res.status(401).json({
        success: false,
        message: "Current password is incorrect.",
      });
      return;
    }
    if (error.message === "2FA_NOT_ENABLED") {
      res.status(400).json({
        success: false,
        message: "2FA is not currently enabled.",
      });
      return;
    }
    console.error("Disable 2FA error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to disable 2FA.",
    });
  }
};

/**
 * Get active sessions
 */
export const getSessionsController = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const sessions = await getUserSessionsService(userId);

    res.json({
      success: true,
      data: { sessions },
    });
  } catch (error: any) {
    console.error("Get sessions error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch sessions.",
    });
  }
};

/**
 * Firebase Token Login: For users registered via Firebase Auth (mobile).
 * 
 * The mobile app signs in via Firebase Auth SDK (signInWithEmailAndPassword), gets an ID token,
 * and sends it here. The backend verifies the token with Firebase Admin SDK, looks up the user
 * profile in Firestore, and either issues JWT tokens (regular users) or starts 2FA flow (admins).
 */
export const firebaseLoginController = async (req: AuthRequest, res: Response) => {
  try {
    const { firebase_token } = req.body;
    if (!firebase_token) {
      res.status(400).json({
        success: false,
        message: "Firebase token is required.",
      });
      return;
    }

    // Verify the Firebase ID token
    let decodedToken: any;
    try {
      decodedToken = await firebaseAuth.verifyIdToken(firebase_token);
    } catch (verifyErr) {
      res.status(401).json({
        success: false,
        message: "Invalid or expired Firebase token.",
      });
      return;
    }

    const uid = decodedToken.uid;
    const email = decodedToken.email || "";

    // Look up the account in the split users/admins collections
    const identity = await findIdentityByIdModel(uid);
    if (!identity) {
      res.status(404).json({
        success: false,
        message: "User profile not found. Please register first.",
      });
      return;
    }
    const profile = identity.profile;
    const userType = identity.user_type;

    if (!profile.is_active) {
      res.status(403).json({
        success: false,
        message: "Your account has been disabled.",
      });
      return;
    }

    const deviceInfo = extractDeviceInfo(req);
    const platform = resolvePlatform(req.headers["x-client-type"] as string | undefined);

    // Verify platform access before proceeding
    try {
      assertPlatformAccess(profile.role, platform);
    } catch (platformErr: any) {
      if (platformErr.message === "PLATFORM_ACCESS_DENIED_USER_WEB") {
        res.status(403).json({
          success: false,
          code: "PLATFORM_ACCESS_DENIED_USER_WEB",
          message: "This account does not have access to the web portal.",
        });
        return;
      }
      if (platformErr.message === "PLATFORM_ACCESS_DENIED_SUPER_ADMIN_MOBILE") {
        res.status(403).json({
          success: false,
          code: "PLATFORM_ACCESS_DENIED_SUPER_ADMIN_MOBILE",
          message: "Super Admin accounts can only access the web portal.",
        });
        return;
      }
      res.status(403).json({
        success: false,
        code: "PLATFORM_ACCESS_DENIED",
        message: "Access denied for this platform.",
      });
      return;
    }

    // Check 2FA requirement
    const has2FAEnabled = profile.is_2fa_enabled && profile.two_fa_secret;
    const roleRequires2FA = requires2FAEnforcement(profile.role);

    if (has2FAEnabled) {
      // 2FA already enabled (any role) - prompt for OTP
      const roleConfig = getRoleAuthConfig(profile.role);
      const { createLoginChallengeModel } = require("../models/totp.model");
      const challenge = await createLoginChallengeModel({ userId: uid, userType, deviceInfo });
      const otpPendingToken = jwt.sign(
        { userId: uid, email, role: profile.role, userType, type: "OTP_PENDING", challengeId: challenge.id, platform },
        env.JWT_SECRET,
        { expiresIn: roleConfig.otpPendingExpiry } as jwt.SignOptions
      );

      res.json({
        success: true,
        data: {
          require_otp: true,
          setup_required: false,
          otp_pending_token: otpPendingToken,
          challenge_id: challenge.id,
        },
        message: "Please enter 6-digit Google Authenticator OTP.",
      });
      return;
    }

    if (roleRequires2FA) {
      // First login for roles that require mandatory 2FA - generate QR code
      const roleConfig = getRoleAuthConfig(profile.role);
      const { generateTotpSecret, generateQrCodeDataUrl } = require("../../../shared/utils/totp.utils");
      const { encryptSecret, decryptSecret } = require("../../../shared/utils/crypto.utils");
      const { createLoginChallengeModel } = require("../models/totp.model");

      // Always generate a new TOTP secret to invalidate any previous setup QR codes
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

      res.json({
        success: true,
        data: {
          require_otp: true,
          setup_required: true,
          qr_code_url: qrCodeUrl,
          secret,
          otpauth_url: `otpauth://totp/${encodeURIComponent("Sofiya Bangles")}:${encodeURIComponent(email)}?secret=${secret}&issuer=${encodeURIComponent("Sofiya Bangles")}&algorithm=SHA1&digits=6&period=30`,
          otp_pending_token: setupToken,
          challenge_id: challenge.id,
        },
        message: "Scan QR code using Google Authenticator.",
      });
      return;
    }

    const correlationId = "AUTH-" + require("uuid").v4();

    // No 2FA requirement - issue JWT directly
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

    const rawRefreshToken = require("uuid").v4();
    const refreshTokenRecord = await createRefreshTokenModel(uid, userType, rawRefreshToken, roleConfig.refreshTokenExpiryDays, platform);
    const session = await createLoginSessionModel(uid, userType, refreshTokenRecord.id, deviceInfo, roleConfig.sessionExpiryDays);

    // Permanent audit record with login time + ip so logout can close the session
    await createAuditLogModel({
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

    res.json({
      success: true,
      data: {
        user: { ...safeUser, is_2fa_enabled: false },
        access_token: accessToken,
        refresh_token: rawRefreshToken,
        session_id: session.id,
        expires_in: roleConfig.accessTokenExpiry,
      },
      message: "Login successful.",
    });
  } catch (error: any) {
    console.error("Firebase login error:", error);
    res.status(500).json({
      success: false,
      message: "Login failed. Please try again.",
    });
  }
};

/**
 * Set password hash for Firebase Auth-registered users
 * Called by the mobile app after Firebase Auth registration to store the bcrypt hash
 * so that the backend login (/auth/login) can verify passwords via bcrypt.compare().
 */
export const setPasswordController = async (req: AuthRequest, res: Response) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      res.status(400).json({
        success: false,
        message: "Email and password are required.",
      });
      return;
    }

    // Find the existing account (users/admins split aware)
    const profile = await findProfileByEmailModel(email.toLowerCase().trim());
    if (!profile) {
      res.status(404).json({
        success: false,
        message: "User profile not found.",
      });
      return;
    }

    // Hash the password and store it in the correct collection
    const salt = await bcrypt.genSalt(12);
    const password_hash = await bcrypt.hash(password, salt);

    const identity = await findIdentityByIdModel(profile.id);
    await db.collection(identity?.collection || "users").doc(profile.id).update({
      password_hash,
      updated_at: nowISTISO(),
    });

    res.json({
      success: true,
      message: "Password hash stored successfully.",
    });
  } catch (error: any) {
    console.error("Set password error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to store password hash.",
    });
  }
};

