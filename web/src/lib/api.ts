"use client";

import axios, {
  AxiosError,
  InternalAxiosRequestConfig,
} from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
  is_2fa_enabled: boolean;
  avatar_url?: string;
}

export interface LoginResponse {
  message: string;
  otp_pending_token?: string;
  is_2fa_enabled: boolean;
  setup_required: boolean;
  qr_code_url?: string;
  secret?: string;
  otpauth_url?: string;
  user?: User;
}

export interface Verify2FAResponse {
  access_token: string;
  refresh_token: string;
  user: User;
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

const apiClient = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
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
        config.headers.Authorization = `Bearer ${token}`;
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
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // If 401 and not a retry, try refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Queue this request until refresh completes
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${token}`;
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
          { refresh_token: refreshToken }
        );

        const refreshData = refreshResp.data;
        // Store new tokens
        localStorage.setItem("access_token", refreshData.access_token);
        localStorage.setItem("refresh_token", refreshData.refresh_token);

        processQueue(null, refreshData.access_token);

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${refreshData.access_token}`;
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
  images?: string[];
  category_id: string;
  quantity: number;
  likes?: number;
  rating?: number;
  reviews?: number;
  is_active: boolean;
  has_variants?: boolean;
  variants?: any[];
  accepts_custom_size?: boolean;
  custom_size_price?: number | string;
  created_at?: string;
  updated_at?: string;
}

export interface Category {
  id: string;
  category_name: string;
  image_url: string;
  display_order: number;
  is_active: boolean;
  model_type_id?: string;
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
  updated_at?: string;
}

export interface AnalyticsOverview {
  totalProducts: number;
  totalUsers: number;
  totalFavorites: number;
  totalCategories: number;
  activeProducts: number;
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

  // Categories
  getCategories: () =>
    apiClient.get('/categories').then(r => extractData<Category[]>(r)),
  createCategory: async (data: { category_name: string; model_type_id?: string; image?: string; standard_sizes?: string[] }) => {
    const formData = new FormData();
    formData.append('category_name', data.category_name);
    if (data.model_type_id) formData.append('model_type_id', data.model_type_id);
    if (data.standard_sizes) formData.append('standard_sizes', JSON.stringify(data.standard_sizes));
    return apiClient.post('/categories', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data.data);
  },
  updateCategory: async (id: string, data: { category_name?: string; model_type_id?: string; image?: string; standard_sizes?: string[] }) => {
    const formData = new FormData();
    if (data.category_name) formData.append('category_name', data.category_name);
    if (data.model_type_id) formData.append('model_type_id', data.model_type_id);
    if (data.standard_sizes) formData.append('standard_sizes', JSON.stringify(data.standard_sizes));
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

  // Analytics
  getOverviewAnalytics: () =>
    apiClient.get('/analytics/overview').then(r => extractData<AnalyticsOverview>(r)),

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

  verify2FA: (otpPendingToken: string, otpCode: string) =>
    apiClient
      .post<{ success: boolean; data: Verify2FAResponse }>("/auth/verify-2fa", {
        otp_pending_token: otpPendingToken,
        otp_code: otpCode,
      })
      .then((r) => r.data.data),

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

  regenerateQR: () =>
    apiClient
      .post<{ success: boolean; data: { qr_code_url: string; secret: string; otp_pending_token: string } }>(
        "/auth/regenerate-qr"
      )
      .then((r) => r.data.data),

  disable2FA: (password: string) =>
    apiClient.post("/auth/disable-2fa", { password }),
};
