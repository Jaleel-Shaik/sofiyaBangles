import { generateSecret, generateURI, verifySync } from "otplib";
import QRCode from "qrcode";

const ISSUER_NAME = "Sofiya Bangles";

/**
 * Generates a new TOTP secret and its corresponding otpauth URI
 */
export const generateTotpSecret = (email: string): { secret: string; otpauthUrl: string } => {
  const secret = generateSecret();
  const otpauthUrl = generateURI({
    issuer: ISSUER_NAME,
    label: email,
    secret,
    digits: 6,
    period: 30,
    algorithm: "sha1",
  });
  return { secret, otpauthUrl };
};

/**
 * Generates a base64 Data URL for a QR Code from an otpauth URI
 */
export const generateQrCodeDataUrl = async (otpauthUrl: string): Promise<string> => {
  try {
    const qrDataUrl = await QRCode.toDataURL(otpauthUrl);
    return qrDataUrl;
  } catch (error) {
    console.error("Error generating QR code:", error);
    throw new Error("FAILED_TO_GENERATE_QR_CODE");
  }
};

/**
 * Verifies a 6-digit TOTP code against an unencrypted secret
 * Uses epochTolerance of 30 seconds (±1 time window at 30s step)
 * to account for clock drift between device and server
 */
export const verifyTotpCode = (secret: string, token: string): boolean => {
  try {
    const result = verifySync({ token, secret, epochTolerance: 30 });
    // verifySync returns { valid: boolean, delta: number }
    return result.valid;
  } catch (error) {
    console.error("TOTP verification error:", error);
    return false;
  }
};
