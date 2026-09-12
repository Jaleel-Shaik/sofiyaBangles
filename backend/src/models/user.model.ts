import { Profile, UserRole, UserType } from "../shared/types";

export { Profile, UserRole, UserType };

export const USER_ROLES: readonly UserRole[] = ["user", "admin", "super_admin"] as const;

export const USER_CONSTRAINTS = {
  ALLOWED_ROLES: USER_ROLES,
  MIN_PASSWORD_LENGTH: 6,
  MAX_NAME_LENGTH: 100,
} as const;

export function isValidRole(role: string): role is UserRole {
  return (USER_ROLES as readonly string[]).includes(role);
}
