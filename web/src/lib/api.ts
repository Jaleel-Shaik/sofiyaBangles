"use client";

import axios, {
  AxiosError,
  InternalAxiosRequestConfig,
} from "axios";
import { logError } from "@/features/errors/lib/error-log";
import { classifyApiError } from "@/features/errors/lib/classify";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

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
  /** Backend field indicating 2FA is required for this user */
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
  
  // Direct login response (non-admin users)
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

// --- API Client with Interceptors ---

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: { 
    "Content-Type": "application/json",
    "x-client-type": "web"
  },
  timeout: 15000,
});

// Track refresh state
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: unknown) => void;
  reject: (reason: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Request interceptor: attach access token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("access_token");
      if (token && config.headers) {
        if (typeof config.headers.set === "function") {
          config.headers.set("Authorization", `Bearer ${token}`);
        } else {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: handle 401 and refresh token
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    // Record every failed request in the Error Logs page.
    const classified = classifyApiError(error);
    logError({
      type: classified.type,
      statusCode: classified.statusCode,
      title: classified.title,
      message: classified.message,
      technical: classified.technical,
      retriable: classified.retriable,
      systemic: classified.systemic,
      url: error.config?.url ?? "",
    });

    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    const url = originalRequest.url ?? "";
    const isAuthRoute =
      url.includes("/auth/login") ||
      url.includes("/auth/verify-2fa") ||
      url.includes("/auth/refresh-token");

    // If 401 and not a retry and not an auth route, try refresh
    if (error.response?.status === 401 && !originalRequest._retry && !isAuthRoute) {
      if (isRefreshing) {
        // Queue this request until refresh completes
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          if (originalRequest.headers) {
            if (typeof originalRequest.headers.set === "function") {
              originalRequest.headers.set("Authorization", `Bearer ${token}`);
            } else {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
          }
          return apiClient(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = localStorage.getItem("refresh_token");
        if (!refreshToken) {
          throw new Error("No refresh token");
        }

        const { data: refreshResp } = await axios.post<{ success: boolean; data: RefreshTokenResponse }>(
          `${API_URL}/auth/refresh-token`,
          { refresh_token: refreshToken },
          { headers: { "x-client-type": "web" } }
        );

        const refreshData = refreshResp.data;
        // Store new tokens
        localStorage.setItem("access_token", refreshData.access_token);
        localStorage.setItem("refresh_token", refreshData.refresh_token);

        processQueue(null, refreshData.access_token);

        if (originalRequest.headers) {
          if (typeof originalRequest.headers.set === "function") {
            originalRequest.headers.set("Authorization", `Bearer ${refreshData.access_token}`);
          } else {
            originalRequest.headers.Authorization = `Bearer ${refreshData.access_token}`;
          }
        }
        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        // Clear tokens and redirect to login
        if (typeof window !== "undefined") {
          localStorage.removeItem("access_token");
          localStorage.removeItem("refresh_token");
          localStorage.removeItem("user");
          window.location.href = "/";
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// --- Data Types ---

export interface Product {
  id: string;
  unique_code: string;
  product_name: string;
  description: string;
  price: number;
  image_url: string;
  images?: any[];
  category_id: string;
  quantity: number;
  likes?: number;
  rating?: number;
  reviews?: number;
  is_active: boolean;
  status?: 'draft' | 'active' | 'out_of_stock' | 'archived';
  deleted_at?: string | null;
  has_variants?: boolean;
  variants?: any[];
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

// Helper to extract nested data from backend { success, data, message } wrapper
const extractData = <T>(response: any): T => response?.data?.data ?? response?.data ?? response;

// --- Admin API ---

export const adminApi = {
  // Products
  getProducts: (page = 1, limit = 10, categoryId?: string, search?: string) => {
    let url = `/products?page=${page}&limit=${limit}`;
    if (categoryId) url += `&category_id=${categoryId}`;
    if (search) url += `&search=${search}`;
    return apiClient.get(url).then((r) => ({
      products: extractData<Product[]>(r),
      total: r.data?.pagination?.total || 0,
    }));
  },
  getAdminProducts: (page = 1, limit = 10) =>
    apiClient.get(`/products/admin?page=${page}&limit=${limit}`).then((r) => ({
      products: extractData<Product[]>(r),
      total: r.data?.pagination?.total || 0,
    })),
  getProductById: (id: string) =>
    apiClient.get(`/products/${id}`).then((r) => extractData<Product>(r)),
  createProduct: async (productData: any, imageUris: string[] = []) => {
    const formData = new FormData();
    Object.keys(productData).forEach(key => {
      if (productData[key] !== undefined && productData[key] !== null) {
        formData.append(key, String(productData[key]));
      }
    });
    imageUris.forEach((uri, i) => {
      if (!uri.startsWith('http')) {
        formData.append('images', uri);
      }
    });
    return apiClient.post('/products', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data.data);
  },
  createProductDirect: (formData: FormData) =>
    apiClient.post('/products', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data.data),
  updateProduct: async (id: string, productData: any, imageUris: string[] = []) => {
    const formData = new FormData();
    Object.keys(productData).forEach(key => {
      if (productData[key] !== undefined && productData[key] !== null) {
        formData.append(key, String(productData[key]));
      }
    });
    imageUris.forEach(uri => {
      if (!uri.startsWith('http')) formData.append('images', uri);
      else formData.append('existing_images', uri);
    });
    return apiClient.put(`/products/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data.data);
  },
  deleteProduct: (id: string) =>
    apiClient.delete(`/products/${id}`).then(r => r.data),
  sellProduct: (id: string, quantity = 1) =>
    apiClient.patch(`/products/${id}/sell`, { quantity }).then(r => r.data.data),

  // Categories
  getCategories: async (modelTypeId?: string) => {
    const res = await apiClient.get('/categories', { params: { model_type_id: modelTypeId } });
    return res.data.data as Category[];
  },
  createCategory: async (data: { category_name: string; model_type_id: string; image?: string; standard_sizes?: string[] }) => {
    const formData = new FormData();
    formData.append('category_name', data.category_name);
    formData.append('model_type_id', data.model_type_id);
    if (data.image) {
      const blob = await fetch(data.image).then(r => r.blob());
      formData.append('image', blob, 'category.jpg');
    }
    if (data.standard_sizes) {
       formData.append('size_type', 'standard');
       data.standard_sizes.forEach(s => formData.append('standard_sizes', s));
    } else {
       formData.append('size_type', 'none');
    }
    return apiClient.post('/categories', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }).then(r => r.data.data);
  },
  updateCategory: async (id: string, data: { category_name?: string; model_type_id?: string; image?: string; standard_sizes?: string[] }) => {
    const formData = new FormData();
    if (data.category_name) formData.append('category_name', data.category_name);
    if (data.model_type_id) formData.append('model_type_id', data.model_type_id);
    if (data.image) {
      const blob = await fetch(data.image).then(r => r.blob());
      formData.append('image', blob, 'category.jpg');
    }
    if (data.standard_sizes) {
       formData.append('size_type', 'standard');
       data.standard_sizes.forEach(s => formData.append('standard_sizes', s));
    } else if (data.standard_sizes !== undefined) {
       formData.append('size_type', 'none');
    }
    return apiClient.put(`/categories/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data.data);
  },
  deleteCategory: (id: string) =>
    apiClient.delete(`/categories/${id}`).then(r => r.data),

  // Model Types
  getModelTypes: () =>
    apiClient.get('/model-types').then(r => extractData<ModelType[]>(r)),
  createModelType: (data: { name: string }) =>
    apiClient.post('/model-types', data).then(r => r.data.data),
  updateModelType: (id: string, data: { name: string }) =>
    apiClient.put(`/model-types/${id}`, data).then(r => r.data.data),
  deleteModelType: (id: string) =>
    apiClient.delete(`/model-types/${id}`).then(r => r.data),

  // Settings / Business Profile
  getBusinessProfile: () =>
    apiClient.get('/settings/business-profile').then(r => extractData<BusinessProfile>(r)),
  updateBusinessProfile: (data: Partial<BusinessProfile>) =>
    apiClient.put('/settings/business-profile', data).then(r => r.data.data),
  uploadBusinessLogo: (file: File) => {
    const formData = new FormData();
    formData.append("logo", file);
    return apiClient
      .post<{ success: boolean; data: BusinessProfile; message: string }>("/settings/business-profile/logo", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((r) => r.data.data);
  },

  getOverviewAnalytics: (categoryId?: string, modelTypeId?: string) =>
    apiClient.get('/analytics/overview', { params: { category_id: categoryId, model_type_id: modelTypeId } }).then(r => extractData<AnalyticsOverview>(r)),

  // Users
  getUsers: () =>
    apiClient.get('/users').then(r => extractData<UserProfile[]>(r)),
  getUserById: (id: string) =>
    apiClient.get(`/users/${id}`).then(r => extractData<UserProfile>(r)),
};

// --- Auth API ---

export const authApi = {
  login: (email: string, password: string) =>
    apiClient.post<{ success: boolean; data: LoginResponse }>("/auth/login", { email, password }).then((r) => r.data.data),

  verify2FA: (
    payloadOrToken:
      | {
          challengeId?: string;
          challenge_id?: string;
          email?: string;
          otp?: string;
          otp_code?: string;
          otp_pending_token?: string;
          useBackupCode?: boolean;
          use_backup_code?: boolean;
        }
      | string,
    legacyOtpCode?: string
  ) => {
    const payload =
      typeof payloadOrToken === "string"
        ? { otp_pending_token: payloadOrToken, otp_code: legacyOtpCode }
        : payloadOrToken;

    return apiClient
      .post<{ success: boolean; data: Verify2FAResponse }>("/auth/verify-2fa", payload)
      .then((r) => r.data.data);
  },

  refreshToken: (refreshToken: string) =>
    apiClient
      .post<{ success: boolean; data: RefreshTokenResponse }>("/auth/refresh-token", {
        refresh_token: refreshToken,
      })
      .then((r) => r.data.data),

  getMe: () => apiClient.get<{ data: User }>("/auth/me").then((r) => r.data.data),

  logout: (refreshToken: string, sessionId?: string) =>
    apiClient.post("/auth/logout", {
      refresh_token: refreshToken,
      session_id: sessionId,
    }),

  getSessions: () =>
    apiClient.get<{ data: Session[] }>("/auth/sessions").then((r) => r.data.data),

  regenerateQR: (otpPendingToken: string) =>
    apiClient
      .post<{ success: boolean; data: { qr_code_url: string; secret: string; otp_pending_token: string } }>(
        "/auth/regenerate-qr",
        { otp_pending_token: otpPendingToken }
      )
      .then((r) => r.data.data),

  disable2FA: (password: string) =>
    apiClient.post("/auth/disable-2fa", { password }),

  uploadAvatar: (file: File) => {
    const formData = new FormData();
    formData.append("avatar", file);
    return apiClient
      .post<{ success: boolean; data: User; message: string }>("/auth/me/avatar", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((r) => r.data.data);
  },

  updateProfile: (data: { full_name?: string; phone?: string }) =>
    apiClient.put<{ success: boolean; data: User; message: string }>("/auth/me", data).then((r) => r.data.data),
};

// --- SuperAdmin API ---

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

export const superAdminApi = {
  getDashboard: (params?: { period?: string; fromDate?: string; toDate?: string; categoryId?: string; modelTypeId?: string; adminId?: string }) =>
    apiClient.get("/super-admin/dashboard", { params }).then((r) => extractData<SuperAdminDashboardData>(r)),

  getSalesList: (params?: { page?: number; limit?: number; status?: string; search?: string }) =>
    apiClient.get("/super-admin/sales", { params }).then((r) => ({
      sales: extractData<any[]>(r),
      total: r.data?.pagination?.total || 0,
    })),

  getSaleDetail: (id: string) =>
    apiClient.get(`/super-admin/sales/${id}`).then((r) => extractData<any>(r)),

  getProductsAnalytics: (params?: { page?: number; limit?: number }) =>
    apiClient.get("/super-admin/products-analytics", { params }).then((r) => ({
      products: extractData<any[]>(r),
      total: r.data?.pagination?.total || 0,
    })),

  getProductAnalyticsDetail: (id: string) =>
    apiClient.get(`/super-admin/products-analytics/${id}`).then((r) => extractData<ProductAnalyticsDetail>(r)),

  getRevenueLedger: (params?: { page?: number; limit?: number; fromDate?: string; toDate?: string; transactionType?: string; adminId?: string }) =>
    apiClient.get("/super-admin/revenue", { params }).then((r) => ({
      items: extractData<RevenueLedgerItem[]>(r),
      total: r.data?.pagination?.total || 0,
    })),

  getAdminActivity: (params?: { page?: number; limit?: number; actorId?: string; action?: string }) =>
    apiClient.get("/super-admin/activity", { params }).then((r) => ({
      items: extractData<any[]>(r),
      total: r.data?.pagination?.total || 0,
    })),

  getNotifications: () =>
    apiClient.get("/super-admin/notifications").then((r) => extractData<any[]>(r)),

  markNotificationRead: (id: string) =>
    apiClient.patch(`/super-admin/notifications/${id}/read`).then((r) => r.data),

  getCommissionSettings: () =>
    apiClient.get("/super-admin/settings/commission").then((r) => extractData<any>(r)),

  updateCommissionSettings: (data: { admin_percentage: number; super_admin_percentage: number }) =>
    apiClient.put("/super-admin/settings/commission", data).then((r) => extractData<any>(r)),

  completeOrder: (id: string) =>
    apiClient.post(`/orders/${id}/complete`).then((r) => r.data),

  refundOrder: (id: string, reason?: string) =>
    apiClient.post(`/orders/${id}/refund`, { reason }).then((r) => r.data),

  // Staff & Admin Management
  getAdmins: () =>
    apiClient.get("/super-admin/admins").then((r) => extractData<AdminStaff[]>(r)),

  createAdmin: (data: { full_name: string; email: string; password: string; phone?: string }) =>
    apiClient.post("/super-admin/admins", data).then((r) => r.data),

  updateAdminStatus: (id: string, isActive: boolean) =>
    apiClient.patch(`/super-admin/admins/${id}/status`, { isActive }).then((r) => r.data),

  deleteAdmin: (id: string) =>
    apiClient.delete(`/super-admin/admins/${id}`).then((r) => r.data),

  // Full Order Management
  getOrders: (params?: { page?: number; limit?: number; status?: string; search?: string }) =>
    apiClient.get("/orders/admin/all", { params }).then((r) => ({
      orders: (r.data?.data || []) as AdminOrder[],
      total: r.data?.pagination?.total || 0,
      totalPages: r.data?.pagination?.totalPages || 1,
    })),

  createOrder: (data: {
    items: Array<{ productId: string; variantId?: string | null; quantity: number }>;
    shippingAddressSnapshot?: any;
  }) => apiClient.post("/orders", data).then((r) => r.data),

  updateOrderStatus: (id: string, status: string, notes?: string) =>
    apiClient.patch(`/orders/${id}/status`, { status, notes }).then((r) => r.data),

  // Customer Management
  getCustomers: (params?: { page?: number; limit?: number; search?: string }) =>
    apiClient.get("/users", { params: { ...params, role: "user" } }).then((r) => ({
      customers: extractData<UserProfile[]>(r),
      total: r.data?.pagination?.total || 0,
    })),

  exportSalesCsvUrl: `${API_URL}/super-admin/export/sales`,
  exportRevenueCsvUrl: `${API_URL}/super-admin/export/revenue`,
  exportProductsCsvUrl: `${API_URL}/super-admin/export/products`,
};

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

export interface AdminOrder {
  id: string;
  order_number: string;
  user_id: string;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  items: Array<{
    id?: string;
    productId?: string;
    product_id?: string;
    productNameSnapshot?: string;
    product_name?: string;
    quantity: number;
    itemPrice?: number;
    unit_price?: number;
    total_amount?: number;
    imageUrl?: string | null;
    image_url?: string | null;
  }>;
  shippingAddressSnapshot?: any;
  shipping_address?: any;
  shipping_address_snapshot?: any;
  total_amount: number;
  subtotal?: number;
  status: string;
  payment_status: string;
  payment_method?: string;
  admin_notes?: string;
  created_at: string;
  updated_at: string;
}

