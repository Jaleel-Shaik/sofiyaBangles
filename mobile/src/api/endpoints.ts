export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    VERIFY_2FA: '/auth/verify-2fa',
    REFRESH_TOKEN: '/auth/refresh-token',
    ME: '/auth/me',
    LOGOUT: '/auth/logout',
    SESSIONS: '/auth/sessions',
    REGENERATE_QR: '/auth/regenerate-qr',
    DISABLE_2FA: '/auth/disable-2fa',
    AVATAR: '/auth/me/avatar',
    SEND_OTP: '/auth/send-otp',
    VERIFY_OTP: '/auth/verify-otp',
    FIREBASE_LOGIN: '/auth/firebase-login',
    SET_PASSWORD: '/auth/set-password',
  },
  PRODUCTS: {
    BASE: '/products',
    ADMIN: '/products/admin',
    RECOMMENDED: '/products/recommended',
    NEW_ARRIVALS: '/products/new-arrivals',
    SEARCH: '/products/search',
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
  FAVORITES: {
    BASE: '/favorites',
    BY_ID: (productId: string) => `/favorites/${productId}`,
  },
  SIZE_PREFERENCES: {
    BASE: '/size-preferences',
    BY_ID: (id: string) => `/size-preferences/${id}`,
  },
  NOTIFICATIONS: {
    BASE: '/notifications',
    BROADCAST: '/notifications/broadcast',
    UNREAD_COUNT: '/notifications/unread-count',
    MARK_READ: (id: string) => `/notifications/${id}/read`,
  },
  ORDERS: {
    BASE: '/orders',
    BY_ID: (id: string) => `/orders/${id}`,
    ADMIN_ALL: '/orders/admin/all',
    COMPLETE: (id: string) => `/orders/${id}/complete`,
    REFUND: (id: string) => `/orders/${id}/refund`,
    STATUS: (id: string) => `/orders/${id}/status`,
  }
};
