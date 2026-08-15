import { generateSecret, verifySync } from "otplib";
import QRCode from "qrcode";

const ISSUER_NAME = "Sofiya Bangles";

/**
 * Encodes a string for use in a URI component (both path and query).
 * RFC 3986 percent-encoding, same as encodeURIComponent.
 */
const uriEncode = (val: string): string => encodeURIComponent(val);

/**
 * Generates a new TOTP secret and its corresponding otpauth URI.
 * URI is constructed manually to ensure all parameters are explicitly included
 * and encoded correctly for broad authenticator app compatibility.
 */
export const generateTotpSecret = (
  email: string
): { secret: string; otpauthUrl: string } => {
  const secret = generateSecret();
  const now = new Date();
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const monthYear = `${months[now.getMonth()]} ${now.getFullYear()}`;
  const issuer = `${ISSUER_NAME} (${monthYear})`;

  // Build URI manually — otplib's generateURI may omit parameters at default values
  const params = new URLSearchParams({
    secret,
    issuer: issuer,
    algorithm: "SHA1",
    digits: "6",
    period: "30",
  });
  const otpauthUrl = `otpauth://totp/${uriEncode(issuer)}:${uriEncode(email)}?${params.toString()}`;
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
 * Uses epochTolerance to account for clock drift between device and server.
 * epochTolerance of 60 seconds means ±60 seconds (±2 time windows) of drift tolerance.
 */
export const verifyTotpCode = (secret: string, token: string): boolean => {
  try {
    const result = verifySync({ token, secret, epochTolerance: 60 });
    return result.valid;
  } catch (error) {
    console.error("TOTP verification error:", error);
    return false;
  }
};
