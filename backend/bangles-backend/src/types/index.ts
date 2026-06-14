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
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  category_name: string;
  image_url: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  product_name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  category_id: string | null;
  quantity: number;
  is_active: boolean;
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
