import { Request, Response } from "express";
import { AuthRequest, DeviceInformation } from "../../../shared/types";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db, auth as firebaseAuth } from "../../../shared/config/firebase";
import { env } from "../../../shared/config/env";
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
    const result = await initiateLoginService(req.body.email, req.body.password, deviceInfo);

    res.json({
      success: true,
      data: result,
      message: (result as any).message || "Login successful.",
    });

  } catch (error: any) {
    if (error.message === "INVALID_CREDENTIALS") {
      res.status(401).json({
        success: false,
        message: "Invalid email or password.",
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

    // Verify user is an admin in Firestore
    try {
      const snapshot = await db.collection("profiles")
        .where("email", "==", normalizedEmail)
        .where("role", "==", "admin")
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

    // Fetch user profile to ensure they are admin
    let userData: any = null;
    let uid = email;
    try {
      const profileSnapshot = await db.collection("profiles")
        .where("email", "==", email)
        .where("role", "==", "admin")
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
    const { otp_pending_token, otp_code } = req.body;
    const deviceInfo = extractDeviceInfo(req);

    const result = await verify2FAOtpService(otp_pending_token, otp_code, deviceInfo);

    res.json({
      success: true,
      data: result,
      message: "2FA Verification successful. User authenticated.",
    });
  } catch (error: any) {
    if (error.message === "EXPIRED_OR_INVALID_PENDING_TOKEN") {
      res.status(401).json({
        success: false,
        message: "OTP session has expired or is invalid. Please log in again.",
      });
      return;
    }
    if (error.message === "ACCOUNT_LOCKED_15_MINUTES") {
      res.status(429).json({
        success: false,
        message: "Account locked due to 5 consecutive failed OTP attempts. Please try again in 15 minutes.",
      });
      return;
    }
    if (error.message === "OTP_ALREADY_USED") {
      res.status(400).json({
        success: false,
        message: "This OTP code has already been used. Please wait 30 seconds for the next code.",
      });
      return;
    }
    if (error.message === "INVALID_OTP") {
      res.status(400).json({
        success: false,
        message: "Invalid Google Authenticator OTP code. Please check your device clock and try again.",
      });
      return;
    }
    console.error("Verify 2FA controller error:", error);
    res.status(500).json({
      success: false,
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

    const result = await rotateRefreshTokenService(refresh_token, deviceInfo);

    res.json({
      success: true,
      data: result,
      message: "Tokens rotated successfully.",
    });
  } catch (error: any) {
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

    await logoutService(userId, refresh_token, session_id);

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
        message: "Invalid or expired OTP pending token. Please login again.",
      });
      return;
    }

    const userId = decoded.userId;
    const email = decoded.email;

    const result = await regenerateQRService(userId, email);

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

    // Look up the Firestore profile by uid
    const profile = await findProfileByIdModel(uid);
    if (!profile) {
      res.status(404).json({
        success: false,
        message: "User profile not found. Please register first.",
      });
      return;
    }

    if (!profile.is_active) {
      res.status(403).json({
        success: false,
        message: "Your account has been disabled.",
      });
      return;
    }

    const deviceInfo = extractDeviceInfo(req);

    // Check if user is admin/super_admin (needs 2FA)
    const is2FAAdminRole = profile.role === "admin" || profile.role === "super_admin";

    if (!is2FAAdminRole) {
      // Regular user - issue JWT directly (no 2FA)
      await create2FAAuditLogModel({
        userId: uid,
        action: "PASSWORD_SUCCESS",
        deviceInfo,
        details: "Firebase Auth login",
      });

      const accessToken = jwt.sign(
        { userId: uid, email, role: profile.role },
        env.JWT_SECRET,
        { expiresIn: "7d" }
      );

      const rawRefreshToken = require("uuid").v4();
      const refreshTokenRecord = await createRefreshTokenModel(uid, rawRefreshToken, 30);
      const session = await createLoginSessionModel(uid, refreshTokenRecord.id, deviceInfo, 7);

      const { password_hash, two_fa_secret, ...safeUser } = profile;

      res.json({
        success: true,
        data: {
          user: { ...safeUser, is_2fa_enabled: false },
          access_token: accessToken,
          refresh_token: rawRefreshToken,
          session_id: session.id,
          expires_in: "7d",
        },
        message: "Login successful.",
      });
      return;
    }

    // Admin / Super Admin - needs 2FA
    if (profile.is_2fa_enabled && profile.two_fa_secret) {
      const otpPendingToken = jwt.sign(
        { userId: uid, email, role: profile.role, type: "OTP_PENDING" },
        env.JWT_SECRET,
        { expiresIn: "5m" }
      );

      res.json({
        success: true,
        data: {
          require_otp: true,
          setup_required: false,
          otp_pending_token: otpPendingToken,
        },
        message: "Please enter 6-digit Google Authenticator OTP.",
      });
      return;
    }

    // First login for admin - needs 2FA setup
    const { generateTotpSecret, generateQrCodeDataUrl } = require("../../../shared/utils/totp.utils");
    const { encryptSecret } = require("../../../shared/utils/crypto.utils");
    
    const { secret, otpauthUrl } = generateTotpSecret(email);
    const encryptedSecret = encryptSecret(secret);
    const qrCodeUrl = await generateQrCodeDataUrl(otpauthUrl);

    await updateProfile2FA(uid, encryptedSecret, false);

    const setupToken = jwt.sign(
      { userId: uid, email, role: profile.role, type: "2FA_SETUP" },
      env.JWT_SECRET,
      { expiresIn: "10m" }
    );

    res.json({
      success: true,
      data: {
        require_otp: true,
        setup_required: true,
        qr_code_url: qrCodeUrl,
        secret,
        otpauth_url: otpauthUrl,
        otp_pending_token: setupToken,
      },
      message: "First login detected. Scan QR code using Google Authenticator.",
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

    // Find the existing profile
    const profile = await findProfileByEmailModel(email.toLowerCase().trim());
    if (!profile) {
      res.status(404).json({
        success: false,
        message: "User profile not found.",
      });
      return;
    }

    // Hash the password and store it
    const salt = await bcrypt.genSalt(12);
    const password_hash = await bcrypt.hash(password, salt);
    
    await db.collection("profiles").doc(profile.id).update({
      password_hash,
      updated_at: new Date().toISOString(),
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

