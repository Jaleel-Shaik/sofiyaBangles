export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    VERIFY_2FA: '/auth/verify-2fa',
    REFRESH_TOKEN: '/auth/refresh-token',
    ME: '/auth/me',
    LOGOUT: '/auth/logout',
    SESSIONS: '/auth/sessions',
    REGENERATE_QR: '/auth/regenerate-qr',
    DISABLE_2FA: '/auth/disable-2fa',
    AVATAR: '/auth/me/avatar',
  },
  PRODUCTS: {
    BASE: '/products',
    ADMIN: '/products/admin',
    BY_ID: (id: string) => `/products/${id}`,
    SELL: (id: string) => `/products/${id}/sell`,
  },
  CATEGORIES: {
    BASE: '/categories',
    BY_ID: (id: string) => `/categories/${id}`,
  },
  MODEL_TYPES: {
    BASE: '/model-types',
    BY_ID: (id: string) => `/model-types/${id}`,
  },
  SETTINGS: {
    BUSINESS_PROFILE: '/settings/business-profile',
    LOGO: '/settings/business-profile/logo',
  },
  ANALYTICS: {
    OVERVIEW: '/analytics/overview',
  },
  USERS: {
    BASE: '/users',
    BY_ID: (id: string) => `/users/${id}`,
  },
  SUPER_ADMIN: {
    DASHBOARD: '/super-admin/dashboard',
    SALES: '/super-admin/sales',
    SALE_BY_ID: (id: string) => `/super-admin/sales/${id}`,
    PRODUCTS_ANALYTICS: '/super-admin/products-analytics',
    PRODUCT_ANALYTICS_BY_ID: (id: string) => `/super-admin/products-analytics/${id}`,
    REVENUE: '/super-admin/revenue',
    ACTIVITY: '/super-admin/activity',
    NOTIFICATIONS: '/super-admin/notifications',
    MARK_NOTIFICATION_READ: (id: string) => `/super-admin/notifications/${id}/read`,
    COMMISSION: '/super-admin/settings/commission',
    ADMINS: '/super-admin/admins',
    ADMIN_STATUS: (id: string) => `/super-admin/admins/${id}/status`,
    ADMIN_BY_ID: (id: string) => `/super-admin/admins/${id}`,
    EXPORT_SALES: '/super-admin/export/sales',
    EXPORT_REVENUE: '/super-admin/export/revenue',
    EXPORT_PRODUCTS: '/super-admin/export/products',
  },
  ORDERS: {
    BASE: '/orders',
    ADMIN_ALL: '/orders/admin/all',
    COMPLETE: (id: string) => `/orders/${id}/complete`,
    REFUND: (id: string) => `/orders/${id}/refund`,
    STATUS: (id: string) => `/orders/${id}/status`,
  }
};
