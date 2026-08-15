import { Request } from "express";

// ─── Roles ───────────────────────────────────────────────
export type UserRole = "user" | "admin" | "super_admin";

// ─── Platform ────────────────────────────────────────────
export type Platform = "web" | "mobile";

// ─── Collection Routing ──────────────────────────────────
// Determines which Firestore collection an account lives in.
// Regular users → "users", admins & super admins → "admins".
export type UserType = "user" | "admin";

// ─── Auth ────────────────────────────────────────────────
export interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
  platform?: Platform;
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
  two_fa_updated_at?: string | null; // Rotation timestamp
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
  user_type: UserType;
  refresh_token_id: string;
  device_info: DeviceInformation;
  is_active: boolean;
  login_at: string;
  last_active_at: string;
  logout_at: string | null;
  expires_at: string;
}

export interface RefreshToken {
  id: string;
  user_id: string;
  user_type: UserType;
  token_hash: string;
  is_revoked: boolean;
  created_at: string;
  expires_at: string;
  revoked_at: string | null;
  platform?: Platform;
}

/**
 * Temporary record created right after the password is verified and
 * before the OTP / 2FA step completes. Deleted on success or by cleanup.
 */
export interface LoginChallenge {
  id: string;
  user_id: string;
  user_type: UserType;
  otp_type: "TOTP";
  otp_hash: string | null;
  correlation_id?: string;
  status: "PENDING" | "VERIFIED" | "EXPIRED" | "FAILED";
  expires_at: string;
  created_at: string;
  verified_at: string | null;
  failed_attempts: number;
  ip_address: string;
  device_info: DeviceInformation;
}

/**
 * Long-retention security event (brute force, account lock, token rotation,
 * 2FA changes, suspicious logins...).
 */
export interface SecurityEvent {
  id: string;
  user_id: string | null;
  user_type: UserType | null;
  event_type: string;
  severity: "info" | "warning" | "critical";
  ip_address: string;
  device_info: DeviceInformation;
  details: string | null;
  created_at: string;
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
  logo_url?: string | null;
  location_lat?: number | null;
  location_lng?: number | null;
  updated_at: string;
}

export interface Category {
  id: string;
  category_name: string;
  image_url: string | null;
  display_order: number;
  is_active: boolean;
  model_type_id: string;
  size_type?: "none" | "standard" | "custom" | "both";
  standard_sizes?: string[];
  custom_measurement_fields?: string[];
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface ModelType {
  id: string;
  name: string;
  is_active: boolean;
  display_order?: number;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  size: string;
  sku?: string | null;
  price: number;
  quantity: number;
  status: 'active' | 'out_of_stock' | 'archived';
  created_at: string;
  updated_at: string;
}

export interface ProductImage {
  id: string;
  product_id: string;
  image_url: string;
  public_id?: string | null;
  alt_text?: string | null;
  display_order: number;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  unique_code: string;
  product_name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  category_id: string;
  model_type_id: string;
  quantity: number;
  likes: number;
  rating: number;
  reviews: number;
  is_active: boolean;
  status?: 'draft' | 'active' | 'out_of_stock' | 'archived';
  deleted_at?: string | null;
  has_variants?: boolean;
  accepts_custom_size?: boolean;
  custom_size_price?: number;
  created_at: string;
  updated_at: string;
  // Joined fields (read-only, populated at query time)
  category_name?: string;
  model_type_name?: string;
  is_favorited?: boolean;
  variants?: ProductVariant[];
  images?: ProductImage[];
}

export interface Favorite {
  id: string;
  user_id: string;
  product_id: string;
  created_at: string;
}

export interface Address {
  id: string;
  user_id: string;
  name: string;
  phone: string;
  address_line_1: string;
  address_line_2?: string | null;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: string;
  user_id: string;
  order_number: string;
  status: "pending" | "confirmed" | "processing" | "shipped" | "out_for_delivery" | "delivered" | "cancelled" | "return_requested" | "returned";
  payment_status: "pending" | "paid" | "failed" | "refunded" | "partially_refunded";
  subtotal: number;
  discount: number;
  shipping_amount: number;
  tax_amount: number;
  total_amount: number;
  shipping_address_snapshot?: Address | null;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  variant_id?: string | null;
  product_name_snapshot: string;
  sku_snapshot?: string | null;
  price_snapshot: number;
  quantity: number;
  subtotal: number;
  created_at: string;
}

export interface Cart {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface CartItem {
  id: string;
  cart_id: string;
  product_id: string;
  variant_id?: string | null;
  quantity: number;
  created_at: string;
  updated_at: string;
}

export interface Review {
  id: string;
  user_id: string;
  product_id: string;
  rating: number;
  comment: string | null;
  damage_details: string | null;
  created_at: string;
  updated_at: string;
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
  user_type: UserType | null;
  action: string;
  table_name: string | null;
  record_id: string | null;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  correlation_id?: string | null;
  session_id?: string | null;
  ip_address: string;
  // API problem tracking
  api_endpoint: string | null;
  api_error: string | null;
  status_code: number | null;
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
  totalOrders: number;
  totalStock: number;
  itemsSold: number;
}

export interface ProductsByCategory {
  category_name: string;
  count: number;
}
