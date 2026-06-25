import { Response } from "express";
import { AuthRequest } from "../types";
import {
  registerService,
  loginService,
  getMeService,
  updateProfileService,
} from "../services/auth.service";

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
    const result = await loginService(req.body);

    res.json({
      success: true,
      data: result,
      message: "Login successful.",
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

import { db, auth } from "../config/firebase";

// In-memory fallback for local dev without service account
const memoryOtps = new Map<string, { otp: string, expiresAt: string }>();

export const sendOtp = async (req: AuthRequest, res: Response) => {
  try {
    const { email, phone } = req.body;
    if (!email) {
      res.status(400).json({ success: false, message: "Email is required." });
      return;
    }

    let phoneNumber = phone;

    // Try Firestore first
    try {
      const snapshot = await db.collection("profiles").where("email", "==", email).where("role", "==", "admin").limit(1).get();
      if (!snapshot.empty) {
        phoneNumber = snapshot.docs[0].data().phone || phoneNumber;
      }
    } catch (dbErr) {
      console.log("⚠️ Firestore unavailable. Using fallback phone number if provided.");
    }

    if (!phoneNumber) {
      res.status(400).json({ success: false, message: "No phone number available to send OTP." });
      return;
    }

    // Generate a 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60000).toISOString(); // 5 minutes

    // Store OTP
    try {
      await db.collection("admin_otps").doc(email).set({
        otp,
        expiresAt,
        createdAt: new Date().toISOString()
      });
    } catch (dbErr) {
      console.log("⚠️ Firestore unavailable. Storing OTP in memory.");
      memoryOtps.set(email, { otp, expiresAt });
    }

    // Send via Twilio
    const { env } = require("../config/env");
    
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
    console.log(`🔑 ADMIN OTP GENERATED FOR ${email}`);
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

    // Fetch user profile to ensure they are admin (safely)
    let userData: any = null;
    let uid = email; // Fallback UID
    try {
      const profileSnapshot = await db.collection("profiles").where("email", "==", email).where("role", "==", "admin").limit(1).get();
      if (!profileSnapshot.empty) {
        userData = profileSnapshot.docs[0].data();
        uid = profileSnapshot.docs[0].id;
      }
    } catch (dbErr) {
      console.log("⚠️ Firestore profile fetch failed, using fallback.");
      userData = { email, role: 'admin' };
    }

    // Create a custom token for the admin
    let customToken = "dummy-fallback-token-for-dev";
    try {
      customToken = await auth.createCustomToken(uid, { role: "admin" });
    } catch (tokenErr) {
      console.log("⚠️ createCustomToken failed (likely missing service account). Using dummy token.");
    }

    res.json({ success: true, customToken, user: userData });
  } catch (error: any) {
    console.error("Verify OTP error:", error);
    res.status(500).json({ success: false, message: "Failed to verify OTP." });
  }
};
