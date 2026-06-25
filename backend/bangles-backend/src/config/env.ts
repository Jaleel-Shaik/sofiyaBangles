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
} as const;
