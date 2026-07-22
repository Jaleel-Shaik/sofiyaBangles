import crypto from "crypto";
import { env } from "../config/env";

const ALGORITHM = "aes-256-cbc";

// Ensure a 32-byte key derived from JWT_SECRET or ENCRYPTION_KEY
const getEncryptionKey = (): Buffer => {
  const secret = process.env.TOTP_ENCRYPTION_KEY || env.JWT_SECRET || "sofiya-bangles-default-encryption-key-32b";
  return crypto.createHash("sha256").update(secret).digest();
};

/**
 * Encrypts a plain text string (e.g. TOTP secret)
 * Returns string in format: iv:encryptedData
 */
export const encryptSecret = (text: string): string => {
  const iv = crypto.randomBytes(16);
  const key = getEncryptionKey();
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return `${iv.toString("hex")}:${encrypted}`;
};

/**
 * Decrypts an encrypted string in format iv:encryptedData
 */
export const decryptSecret = (encryptedText: string): string => {
  const parts = encryptedText.split(":");
  if (parts.length !== 2) {
    throw new Error("Invalid encrypted payload format");
  }
  const iv = Buffer.from(parts[0], "hex");
  const encrypted = parts[1];
  const key = getEncryptionKey();
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
};
