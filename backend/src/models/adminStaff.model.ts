export interface AdminRecord {
  id: string;
  full_name?: string;
  email?: string;
  phone?: string | null;
  role?: string;
  isActive?: boolean;
  is_active?: boolean;
  twoFactorEnabled?: boolean;
  is_2fa_enabled?: boolean;
  created_at?: string | null;
  updated_at?: string | null;
  [key: string]: unknown;
}

export const ADMIN_STAFF_CONSTRAINTS = {
  MIN_PASSWORD_LENGTH: 6,
  ALLOWED_ROLES: ["admin", "super_admin"] as const,
} as const;
