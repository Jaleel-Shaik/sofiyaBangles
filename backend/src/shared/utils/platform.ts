import { Platform } from "../types";

/**
 * Platform authorization matrix.
 *
 * Determines which platforms each role is allowed to use:
 *   - user        → mobile only
 *   - admin       → web + mobile
 *   - super_admin → web only
 */
const PLATFORM_ACCESS: Record<string, Platform[]> = {
  user: ["mobile"],
  admin: ["web", "mobile"],
  super_admin: ["web"],
};

/**
 * Asserts that the given role is allowed on the given platform.
 * Throws a descriptive error if access is denied.
 *
 * Must be called AFTER authentication but BEFORE issuing tokens/sessions.
 */
export function assertPlatformAccess(role: string, platform: Platform): void {
  const allowed = PLATFORM_ACCESS[role] || ["mobile"];
  if (allowed.includes(platform)) return;

  if (role === "user" && platform === "web") {
    throw new Error("PLATFORM_ACCESS_DENIED_USER_WEB");
  }
  if (role === "super_admin" && platform === "mobile") {
    throw new Error("PLATFORM_ACCESS_DENIED_SUPER_ADMIN_MOBILE");
  }
  throw new Error("PLATFORM_ACCESS_DENIED");
}

/**
 * Resolves a trusted platform value from the x-client-type header.
 * Falls back to "web" if the header is missing or unrecognized.
 */
export function resolvePlatform(clientTypeHeader: string | undefined): Platform {
  if (clientTypeHeader === "mobile") return "mobile";
  return "web";
}
