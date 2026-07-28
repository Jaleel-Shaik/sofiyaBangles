import { Href } from 'expo-router';

export const ROLES = {
  USER: 'user',
  ADMIN: 'admin',
  SUPER_ADMIN: 'super_admin',
} as const;

export type UserRole = (typeof ROLES)[keyof typeof ROLES];

interface NavigateUser {
  role: string;
}

export function getDashboardHref(user: NavigateUser | null, token: string | null): Href {
  if (!token || !user) {
    return '/login';
  }
  switch (user.role) {
    case ROLES.ADMIN:
      return '/(admin)/(tabs)/dashboard';
    case ROLES.SUPER_ADMIN:
      return '/login';
    default:
      return '/(tabs)/home';
  }
}

export function isSuperAdminOnMobile(
  user: { role: string } | null,
): boolean {
  return user?.role === ROLES.SUPER_ADMIN;
}
