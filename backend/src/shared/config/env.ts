import dotenv from "dotenv";

dotenv.config();

export const env = {
  PORT: Number(process.env.PORT) || 5000,

  // Database
  DB_HOST: process.env.DB_HOST || "",
  DB_PORT: Number(process.env.DB_PORT) || 5432,
  DB_NAME: process.env.DB_NAME || "postgres",
  DB_USER: process.env.DB_USER || "postgres",
  DB_PASSWORD: process.env.DB_PASSWORD || "",

  // JWT
  JWT_SECRET: process.env.JWT_SECRET || "sofiya-bangles-jwt-secret-change-me",
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "7d",

  // TOTP/2FA Encryption
  TOTP_ENCRYPTION_KEY: process.env.TOTP_ENCRYPTION_KEY || "",
  TOTP_QR_CODE_EXPIRY_MS: Number(process.env.TOTP_QR_CODE_EXPIRY_MS) || 600000, // 10 minutes

  // Firebase
  FIREBASE_STORAGE_BUCKET: process.env.FIREBASE_STORAGE_BUCKET || "",

  // Cloudinary
  CLOUD_NAME: process.env.CLOUD_NAME || "",
  CLOUD_API_KEY: process.env.CLOUD_API_KEY || "",
  CLOUD_API_SECRET: process.env.CLOUD_API_SECRET || "",

  // WhatsApp
  WHATSAPP_NUMBER: process.env.WHATSAPP_NUMBER || "",

  // Twilio SMS
  TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID || "",
  TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN || "",
  TWILIO_PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER || "",

  // Session Cleanup Interval in ms (default 1 hour)
  SESSION_CLEANUP_INTERVAL_MS: Number(process.env.SESSION_CLEANUP_INTERVAL_MS) || 3600000,

  // Maximum allowed active sessions per user
  MAX_ACTIVE_SESSIONS: Number(process.env.MAX_ACTIVE_SESSIONS) || 5,

  // Role-specific 2FA / Auth Configuration
  // Admin role settings
  ADMIN_OTP_PENDING_EXPIRY: process.env.ADMIN_OTP_PENDING_EXPIRY || "5m",
  ADMIN_QR_SETUP_EXPIRY: process.env.ADMIN_QR_SETUP_EXPIRY || "10m",
  ADMIN_ACCESS_TOKEN_EXPIRY: process.env.ADMIN_ACCESS_TOKEN_EXPIRY || "7d",
  ADMIN_SESSION_EXPIRY_DAYS: Number(process.env.ADMIN_SESSION_EXPIRY_DAYS) || 7,
  ADMIN_REFRESH_TOKEN_EXPIRY_DAYS: Number(process.env.ADMIN_REFRESH_TOKEN_EXPIRY_DAYS) || 30,

  // Super Admin settings (stricter security)
  SUPER_ADMIN_OTP_PENDING_EXPIRY: process.env.SUPER_ADMIN_OTP_PENDING_EXPIRY || "3m",
  SUPER_ADMIN_QR_SETUP_EXPIRY: process.env.SUPER_ADMIN_QR_SETUP_EXPIRY || "7m",
  SUPER_ADMIN_ACCESS_TOKEN_EXPIRY: process.env.SUPER_ADMIN_ACCESS_TOKEN_EXPIRY || "1d",
  SUPER_ADMIN_SESSION_EXPIRY_DAYS: Number(process.env.SUPER_ADMIN_SESSION_EXPIRY_DAYS) || 1,
  SUPER_ADMIN_REFRESH_TOKEN_EXPIRY_DAYS: Number(process.env.SUPER_ADMIN_REFRESH_TOKEN_EXPIRY_DAYS) || 7,
} as const;
