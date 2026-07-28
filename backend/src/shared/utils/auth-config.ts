import { env } from "../config/env";

/**
 * Role-specific authentication configuration.
 * Super admin has stricter security (shorter expiry tokens, shorter sessions).
 * Admin has moderate security settings.
 * Regular users have the longest expiry settings.
 */
export interface RoleAuthConfig {
  otpPendingExpiry: string;
  qrSetupExpiry: string;
  accessTokenExpiry: string;
  sessionExpiryDays: number;
  refreshTokenExpiryDays: number;
}

/**
 * Returns role-specific auth configuration.
 *
 * @param role - The user's role ('super_admin', 'admin', 'user', etc.)
 */
/**
 * Check if a role requires mandatory 2FA enforcement on first login.
 * Users of any role can voluntarily enable 2FA later via settings.
 *
 * @param role - The user's role
 * @returns true if this role must set up 2FA before accessing the app
 */
export const requires2FAEnforcement = (role: string): boolean => {
  return ["admin", "super_admin"].includes(role);
};

export const getRoleAuthConfig = (role: string): RoleAuthConfig => {
  switch (role) {
    case "super_admin":
      return {
        otpPendingExpiry: env.SUPER_ADMIN_OTP_PENDING_EXPIRY,
        qrSetupExpiry: env.SUPER_ADMIN_QR_SETUP_EXPIRY,
        accessTokenExpiry: env.SUPER_ADMIN_ACCESS_TOKEN_EXPIRY,
        sessionExpiryDays: env.SUPER_ADMIN_SESSION_EXPIRY_DAYS,
        refreshTokenExpiryDays: env.SUPER_ADMIN_REFRESH_TOKEN_EXPIRY_DAYS,
      };
    case "admin":
      return {
        otpPendingExpiry: env.ADMIN_OTP_PENDING_EXPIRY,
        qrSetupExpiry: env.ADMIN_QR_SETUP_EXPIRY,
        accessTokenExpiry: env.ADMIN_ACCESS_TOKEN_EXPIRY,
        sessionExpiryDays: env.ADMIN_SESSION_EXPIRY_DAYS,
        refreshTokenExpiryDays: env.ADMIN_REFRESH_TOKEN_EXPIRY_DAYS,
      };
    default:
      // Regular users and any other roles
      return {
        otpPendingExpiry: "5m",
        qrSetupExpiry: "10m",
        accessTokenExpiry: "7d",
        sessionExpiryDays: 30,
        refreshTokenExpiryDays: 30,
      };
  }
};
