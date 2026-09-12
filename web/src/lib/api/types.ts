export interface User {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  role: string;
  is_2fa_enabled: boolean;
  avatar_url?: string;
}

export interface LoginResponse {
  message: string;
  challengeId?: string;
  challenge_id?: string;
  state?: string;
  status?: string;
  requiresOtp?: boolean;
  require_otp?: boolean;
  isTotpSetupRequired?: boolean;
  setup_required?: boolean;
  qrCodeUrl?: string;
  qr_code_url?: string;
  expiresAt?: string;
  expires_at?: string;
  otp_pending_token?: string;
  is_2fa_enabled?: boolean;
  secret?: string;
  otpauthUrl?: string;
  otpauth_url?: string;
  access_token?: string;
  refresh_token?: string;
  session_id?: string;
  expires_in?: string;
  user?: User;
}

export interface Verify2FAResponse {
  access_token: string;
  refresh_token: string;
  session_id?: string;
  user: User;
  backupCodes?: string[];
  backup_codes?: string[];
}

export interface RefreshTokenResponse {
  access_token: string;
  refresh_token: string;
}

export interface Session {
  id: string;
  device_info: {
    browser?: string;
    os?: string;
    ip_address?: string;
    client_type?: string;
  };
  login_at: string;
  last_active_at: string;
  is_active: boolean;
}

export interface ProductImage {
  id?: string;
  image_url: string;
  is_primary?: boolean;
  display_order?: number;
}

export interface ProductVariant {
  id?: string;
  size?: string;
  color?: string;
  price?: number;
  stock_quantity?: number;
  quantity?: number;
  sku?: string;
}

export interface Product {
  id: string;
  unique_code: string;
  product_name: string;
  description: string;
  price: number;
  image_url: string;
  images?: (ProductImage | string)[];
  category_id: string;
  quantity: number;
  likes?: number;
  rating?: number;
  reviews?: number;
  is_active: boolean;
  status?: 'draft' | 'active' | 'out_of_stock' | 'archived';
  deleted_at?: string | null;
  has_variants?: boolean;
  variants?: ProductVariant[];
  accepts_custom_size?: boolean;
  custom_size_price?: number | string;
  model_type_id: string;
  category_name?: string;
  model_type_name?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Category {
  id: string;
  category_name: string;
  image_url: string;
  display_order: number;
  is_active: boolean;
  model_type_id: string;
  size_type?: 'none' | 'standard' | 'custom' | 'both';
  standard_sizes?: string[];
  custom_measurement_fields?: string[];
}

export interface ModelType {
  id: string;
  name: string;
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
  updated_at?: string;
}

export interface AnalyticsOverview {
  totalProducts: number;
  totalUsers: number;
  totalFavorites: number;
  totalCategories: number;
  activeProducts: number;
  totalOrders: number;
  totalStock: number;
  itemsSold: number;
}

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

export interface SuperAdminDashboardData {
  kpis: {
    totalProducts: number;
    activeProducts: number;
    productsSold: number;
    unitsSold: number;
    grossSales: number;
    netSales: number;
    totalRefunds: number;
    adminEarnings: number;
    superAdminEarnings: number;
    pendingOrders: number;
    lowStockCount: number;
    outOfStockCount: number;
  };
  commission: {
    admin_percentage: number;
    super_admin_percentage: number;
    updated_at: string;
    updated_by?: string;
  };
  salesTrend: Array<{
    date: string;
    grossSales: number;
    adminEarnings: number;
    superAdminEarnings: number;
    unitsSold: number;
    orderCount: number;
  }>;
  topSellingProducts: Array<{
    product_id: string;
    product_name: string;
    category_name: string;
    image_url: string | null;
    units_sold: number;
    gross_revenue: number;
    super_admin_share: number;
    stock: number;
  }>;
  categoryPerformance: Array<{
    category_id: string;
    category_name: string;
    units_sold: number;
    gross_revenue: number;
    super_admin_share: number;
  }>;
  recentSales: Array<{
    order_id: string;
    order_number: string;
    customer_name?: string;
    created_at: string;
    items_count: number;
    total_amount: number;
    super_admin_share: number;
    admin_share: number;
    status: string;
  }>;
  recentActivity: Array<{
    id: string;
    actor_id: string | null;
    actor_name?: string;
    action: string;
    details: string;
    created_at: string;
  }>;
}

export interface RevenueLedgerItem {
  id: string;
  order_id: string;
  order_item_id: string;
  product_id: string;
  product_name?: string;
  sale_rate?: number;
  quantity?: number;
  admin_id: string;
  admin_name?: string;
  gross_amount: number;
  admin_share_percentage: number;
  super_admin_share_percentage: number;
  admin_share_amount: number;
  super_admin_share_amount: number;
  transaction_type: "SALE" | "REFUND" | "ADJUSTMENT" | "REVERSAL";
  status: "completed" | "reversed";
  currency: string;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProductAnalyticsDetail {
  product: Product;
  metrics: {
    units_sold: number;
    orders_count: number;
    gross_revenue: number;
    admin_share: number;
    super_admin_share: number;
    first_sale_date: string | null;
    last_sale_date: string | null;
    current_stock: number;
  };
  salesHistory: Array<{
    order_id: string;
    order_number: string;
    sale_date: string;
    quantity: number;
    unit_price: number;
    total_amount: number;
    admin_share: number;
    super_admin_share: number;
  }>;
  stockHistory: Array<{
    id: string;
    action: string;
    quantity_change: number;
    new_quantity: number;
    actor_id: string | null;
    created_at: string;
  }>;
}

export interface AdminStaff {
  id: string;
  full_name: string;
  email: string;
  phone?: string | null;
  role: string;
  isActive: boolean;
  twoFactorEnabled: boolean;
  created_at: string | null;
  updated_at?: string | null;
}

export interface ShippingAddressSnapshot {
  name?: string;
  phone?: string;
  address_line1?: string;
  address_line_1?: string;
  address_line2?: string;
  address_line_2?: string;
  street?: string;
  city?: string;
  state?: string;
  pincode?: string;
  postal_code?: string;
  country?: string;
  [key: string]: unknown;
}

export interface AdminOrderItem {
  id?: string;
  productId?: string;
  product_id?: string;
  productNameSnapshot?: string;
  product_name?: string;
  product_name_snapshot?: string;
  category_name_snapshot?: string;
  sku_snapshot?: string;
  price_snapshot?: number;
  subtotal?: number;
  quantity: number;
  itemPrice?: number;
  unit_price?: number;
  total_amount?: number;
  imageUrl?: string | null;
  image_url?: string | null;
}

export interface AdminOrder {
  id: string;
  order_number: string;
  user_id: string;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  items: AdminOrderItem[];
  shippingAddressSnapshot?: ShippingAddressSnapshot | null;
  shipping_address?: ShippingAddressSnapshot | null;
  shipping_address_snapshot?: ShippingAddressSnapshot | null;
  total_amount: number;
  subtotal?: number;
  admin_share?: number;
  super_admin_share?: number;
  net_amount?: number;
  status: string;
  payment_status: string;
  payment_method?: string;
  admin_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CommissionSettings {
  admin_percentage: number;
  super_admin_percentage: number;
  updated_at?: string;
  updated_by?: string;
}

export interface AdminActivityItem {
  id: string;
  actor_id: string;
  actor_name?: string;
  actor_role?: string;
  action: string;
  resource_type: string;
  resource_id: string;
  details?: Record<string, unknown>;
  ip_address?: string;
  created_at: string;
}

export interface AdminNotification {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  link?: string;
  created_at: string;
}

export interface ProductAnalyticsItem {
  id: string;
  unique_code: string;
  product_name: string;
  category_id: string;
  category_name?: string;
  model_type_id: string;
  model_type_name?: string;
  price: number;
  quantity: number;
  units_sold?: number;
  gross_sales?: number;
  gross_revenue?: number;
  admin_share?: number;
  super_admin_share?: number;
  net_sales?: number;
  status: string;
  image_url?: string;
}
