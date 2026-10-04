/**
 * Utility functions for PII (Personally Identifiable Information) masking
 * and audit log sanitization.
 *
 * Ensures phone numbers, email addresses, and security credentials
 * are never exposed in plaintext in application logs, audit trails, or third-party monitoring.
 */

/**
 * Masks a phone number for secure logging and display.
 * Example:
 *   "+919876543210" -> "+91 98****3210"
 *   "9876543210"    -> "98****3210"
 *   "12345"         -> "*****"
 */
export function maskPhoneNumber(phone?: string | null): string {
  if (!phone || typeof phone !== "string") return "[REDACTED]";
  const trimmed = phone.trim();
  if (trimmed.length <= 4) return "*".repeat(trimmed.length);

  // Strip non-digits to analyze structure
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length < 6) return "*".repeat(trimmed.length);

  // Preserve country prefix if exists (e.g. +91)
  const hasPlus = trimmed.startsWith("+");
  const prefix = hasPlus ? `+${digits.slice(0, 2)} ` : "";
  const mainDigits = hasPlus ? digits.slice(2) : digits;

  if (mainDigits.length <= 4) {
    return `${prefix}****`;
  }

  const first2 = mainDigits.slice(0, 2);
  const last4 = mainDigits.slice(-4);
  return `${prefix}${first2}****${last4}`;
}

/**
 * Masks an email address for secure logging.
 * Example:
 *   "fatima.begum@example.com" -> "f***m@example.com"
 */
export function maskEmail(email?: string | null): string {
  if (!email || typeof email !== "string") return "[REDACTED]";
  const parts = email.split("@");
  if (parts.length !== 2) return "[REDACTED_EMAIL]";

  const [name, domain] = parts;
  if (name.length <= 2) {
    return `${name[0] || "*"}***@${domain}`;
  }
  return `${name[0]}***${name[name.length - 1]}@${domain}`;
}

/**
 * Standardizes a phone number to pure E.164 digits format (e.g. 919876543210).
 * Prepends "91" if a standard 10-digit Indian mobile number is supplied.
 */
export function normalizePhoneE164(phone: string): string {
  let digits = phone.replace(/\D/g, "");
  if (digits.length === 10) {
    digits = `91${digits}`;
  }
  return digits;
}

/**
 * Keys that contain sensitive user PII or security credentials.
 */
const SENSITIVE_KEY_PATTERNS = [
  /password/i,
  /secret/i,
  /token/i,
  /authorization/i,
  /api[_-]?key/i,
  /two[_-]?fa/i,
  /totp/i,
  /credit[_-]?card/i,
  /cvv/i,
];

const PHONE_KEY_PATTERNS = [/phone/i, /mobile/i, /whatsapp/i];
const EMAIL_KEY_PATTERNS = [/email/i];

/**
 * Deeply sanitizes any JavaScript object or array before logging,
 * ensuring all sensitive fields (PII, tokens, passwords) are masked.
 */
export function sanitizeLog(data: any, depth = 0): any {
  if (depth > 5) return "[DEPTH_LIMIT]";
  if (data === null || data === undefined) return data;

  if (typeof data === "string") {
    return data;
  }

  if (typeof data !== "object") {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeLog(item, depth + 1));
  }

  const sanitized: Record<string, any> = {};

  for (const [key, val] of Object.entries(data)) {
    if (SENSITIVE_KEY_PATTERNS.some((pattern) => pattern.test(key))) {
      sanitized[key] = "[REDACTED_CREDENTIAL]";
      continue;
    }

    if (PHONE_KEY_PATTERNS.some((pattern) => pattern.test(key))) {
      sanitized[key] = typeof val === "string" ? maskPhoneNumber(val) : "[REDACTED_PHONE]";
      continue;
    }

    if (EMAIL_KEY_PATTERNS.some((pattern) => pattern.test(key))) {
      sanitized[key] = typeof val === "string" ? maskEmail(val) : "[REDACTED_EMAIL]";
      continue;
    }

    if (val && typeof val === "object") {
      sanitized[key] = sanitizeLog(val, depth + 1);
    } else {
      sanitized[key] = val;
    }
  }

  return sanitized;
}
