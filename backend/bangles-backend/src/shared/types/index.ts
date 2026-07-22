import { Request } from "express";

// ─── Roles ───────────────────────────────────────────────
export type UserRole = "user" | "admin" | "super_admin";

// ─── Auth ────────────────────────────────────────────────
export interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
}

export interface AuthRequest extends Request {
  user?: JwtPayload;
}

// ─── Database Models ─────────────────────────────────────
export interface Profile {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  role: UserRole;
  password_hash: string;
  expo_push_token: string | null;
  is_active: boolean;
  is_2fa_enabled?: boolean;
  two_fa_secret?: string | null; // Encrypted secret
  created_at: string;
  updated_at: string;
}

export interface DeviceInformation {
  device_id?: string;
  client_type?: "web" | "mobile" | "unknown";
  browser?: string;
  os?: string;
  ip_address?: string;
  user_agent?: string;
}

export interface LoginSession {
  id: string;
  user_id: string;
  refresh_token_id: string;
  device_info: DeviceInformation;
  is_active: boolean;
  login_at: string;
  last_active_at: string;
  expires_at: string;
}

export interface RefreshToken {
  id: string;
  user_id: string;
  token_hash: string;
  is_revoked: boolean;
  created_at: string;
  expires_at: string;
}

export interface OtpStatus {
  user_id: string;
  failed_attempts: number;
  locked_until: string | null;
  last_failed_at: string | null;
  used_tokens: string[]; // Replay attack prevention store
}

export interface BusinessProfile {
  store_name: string;
  description: string;
  business_hours: string;
  address: string;
  whatsapp_number: string;
  email: string;
  phone_number: string;
  updated_at: string;
}

export interface Category {
  id: string;
  category_name: string;
  image_url: string | null;
  display_order: number;
  is_active: boolean;
  model_type_id?: string | null;
  size_type?: 'none' | 'standard' | 'custom' | 'both';
  standard_sizes?: string[];
  custom_measurement_fields?: string[];
  created_at: string;
  updated_at: string;
}

export interface ModelType {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface ProductVariant {
  id: string;
  size: string;
  price: number | string;
  quantity: number;
}

export interface Product {
  id: string;
  unique_code: string;
  product_name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  images?: string[];
  category_id: string | null;
  quantity: number;
  likes: number;
  rating: number;
  reviews: number;
  is_active: boolean;
  has_variants?: boolean;
  variants?: ProductVariant[];
  accepts_custom_size?: boolean;
  custom_size_price?: number | string;
  created_at: string;
  updated_at: string;
  // Joined fields
  category_name?: string;
  is_favorited?: boolean;
}

export interface Favorite {
  id: string;
  user_id: string;
  product_id: string;
  created_at: string;
}

export interface UserSizePreference {
  id: string;
  user_id: string;
  category_id: string;
  profile_name: string;
  is_custom: boolean;
  standard_size?: string;
  custom_measurements?: Record<string, number | string>;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  title: string;
  body: string | null;
  type: string;
  product_id: string | null;
  sent_by: string | null;
  user_id: string | null;
  is_read: boolean;
  created_at: string;
}

export interface AuditLog {
  id: string;
  actor_id: string | null;
  action: string;
  table_name: string | null;
  record_id: string | null;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  created_at: string;
}

// ─── API Response ────────────────────────────────────────
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ─── Analytics ───────────────────────────────────────────
export interface OverviewAnalytics {
  totalProducts: number;
  totalCategories: number;
  totalUsers: number;
  totalFavorites: number;
  activeProducts: number;
}

export interface ProductsByCategory {
  category_name: string;
  count: number;
}
