import { API_ENDPOINTS } from "./endpoints";
import axios, { create } from 'axios';
import * as SecureStore from 'expo-secure-store';
import { AppState, AppStateStatus, Platform } from 'react-native';
import {
  initApiClientConfig,
  getCachedApiBaseUrl,
  getCachedApiSource,
} from './config';
import { useApiErrorBus, registerRetryHandler } from './errorBus';

// Resolve the API URL (cached sync value). This follows your current network
// automatically — see config.ts for the priority order.
let API_URL = getCachedApiBaseUrl();

export const apiClient = create({
  baseURL: API_URL,
  timeout: 15000, // 15 seconds timeout
  headers: {
    'Content-Type': 'application/json',
    'x-client-type': 'mobile',
  },
});

// Resolve the "correct" URL at startup and point the client at it.
// On Android emulators this becomes 10.0.2.2, on physical devices it becomes
// the dev machine's current LAN IP (re-detected every app start).
initApiClientConfig()
  .then((url) => {
    API_URL = url;
    apiClient.defaults.baseURL = url;
    if (__DEV__) {
      console.log('Using API URL:', url, `(source: ${getCachedApiSource()})`);
    }
  })
  .catch((error) => {
    if (__DEV__) {
      console.error('Failed to resolve API base URL:', error);
    }
  });

if (__DEV__) {
  console.log('Platform:', Platform.OS);
}

// ─── Health Check ─────────────────────────────────────────
export const checkServerConnection = async (): Promise<boolean> => {
  try {
    await apiClient.get(API_ENDPOINTS.PRODUCTS.BASE, { timeout: 5000 });
    return true;
  } catch {
    return false;
  }
};

// ─── Token Refresh State ─────────────────────────────────
let isRefreshing = false;
let failedQueue: {
  resolve: (token: string) => void;
  reject: (error: any) => void;
}[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else if (token) {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// ─── Token Management Helpers ─────────────────────────────
const getToken = async (): Promise<string | null> => {
  try {
    return await SecureStore.getItemAsync('auth_token');
  } catch {
    return null;
  }
};

const getRefreshToken = async (): Promise<string | null> => {
  try {
    return await SecureStore.getItemAsync('refresh_token');
  } catch {
    return null;
  }
};

const setTokens = async (accessToken: string, refreshToken: string) => {
  try {
    await SecureStore.setItemAsync('auth_token', accessToken);
    await SecureStore.setItemAsync('refresh_token', refreshToken);
  } catch (error) {
    console.error('Error storing tokens:', error);
  }
};

const clearTokens = async () => {
  try {
    await SecureStore.deleteItemAsync('auth_token');
    await SecureStore.deleteItemAsync('refresh_token');
    await SecureStore.deleteItemAsync('auth_user');
  } catch (error) {
    console.error('Error clearing tokens:', error);
  }
};

// ─── Request Interceptor ──────────────────────────────────
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const token = await getToken();
      if (token && config.headers) {
        if (typeof config.headers.set === 'function') {
          config.headers.set('Authorization', `Bearer ${token}`);
        } else {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }
    } catch (error) {
      console.error('Error fetching token from SecureStore:', error);
    }
    const method = config.method?.toUpperCase() || 'GET';
    const url = config.url || '';
    if (__DEV__) {
      console.log(`[API] ${method} ${url}`);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// ─── Response Interceptor: Logging + Global Error Popup ───
apiClient.interceptors.response.use(
  (response) => {
    const method = response.config?.method?.toUpperCase() || 'GET';
    const url = response.config?.url || '';
    const status = response.status;
    if (__DEV__) {
      console.log(`[API] ${method} ${url} → ${status}`);
    }
    return response;
  },
  (error) => {
    const method = error.config?.method?.toUpperCase() || 'GET';
    const url = error.config?.url || '';
    const status = error.response?.status || 'NETWORK_ERROR';
    const msg = error.response?.data?.message || error.message || 'Unknown error';
    if (__DEV__) {
      console.error(`[API] ${method} ${url} → ${status}: ${msg}`);
    }

    // Surface connectivity / server failures to the global popup
    // (timeouts, network unreachable, 5xx).
    useApiErrorBus.getState().reportError(error);
    return Promise.reject(error);
  }
);

// ─── Response Interceptor with Refresh Token Rotation ─────
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const url = originalRequest?.url || '';

    // Skip refresh for auth endpoints to avoid loops
    const isAuthRoute = url.includes(API_ENDPOINTS.AUTH.LOGIN) ||
      url.includes(API_ENDPOINTS.AUTH.REGISTER) ||
      url.includes(API_ENDPOINTS.AUTH.SEND_OTP) ||
      url.includes(API_ENDPOINTS.AUTH.VERIFY_OTP) ||
      url.includes(API_ENDPOINTS.AUTH.VERIFY_2FA) ||
      url.includes(API_ENDPOINTS.AUTH.REFRESH_TOKEN);

    // If 401 and not already retried and not an auth route
    if (error.response?.status === 401 && !originalRequest._retry && !isAuthRoute) {
      if (isRefreshing) {
        // Queue the request while refresh is in progress
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              if (typeof originalRequest.headers.set === 'function') {
                originalRequest.headers.set('Authorization', `Bearer ${token}`);
              } else {
                originalRequest.headers.Authorization = `Bearer ${token}`;
              }
            }
            return apiClient(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = await getRefreshToken();
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        const response = await axios.post(`${getCachedApiBaseUrl()}/auth/refresh-token`, {
          refresh_token: refreshToken,
        }, {
          headers: { 'x-client-type': 'mobile' },
        });

        const { access_token, refresh_token: newRefreshToken } = response.data.data;

        await setTokens(access_token, newRefreshToken);

        // Also update the auth store with the new tokens
        try {
          const { useAuthStore } = await import('../store/authStore');
          useAuthStore.getState().setTokens(access_token, newRefreshToken);
        } catch (e) {
          console.warn('Could not update auth store with new tokens:', e);
        }

        processQueue(null, access_token);

        // Retry the original request with new token
        if (originalRequest.headers) {
          if (typeof originalRequest.headers.set === 'function') {
            originalRequest.headers.set('Authorization', `Bearer ${access_token}`);
          } else {
            originalRequest.headers.Authorization = `Bearer ${access_token}`;
          }
        }

        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);

        // Refresh token failed - force logout
        await clearTokens();
        const { useAuthStore } = await import('../store/authStore');
        useAuthStore.getState().forceLogout();

        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // Handle other auth errors (non-401)
    if (error.response?.status === 401 && isAuthRoute) {
      return Promise.reject(error);
    }

    return Promise.reject(error);
  }
);

// ─── AppState Listener for Session Management ─────────────
let appStateSubscription: any = null;

const refreshTokenSilently = async () => {
  try {
    const refreshToken = await getRefreshToken();
    if (!refreshToken) return;

    const response = await axios.post(`${getCachedApiBaseUrl()}/auth/refresh-token`, {
      refresh_token: refreshToken,
    }, {
      headers: { 'x-client-type': 'mobile' },
    });

    const { access_token, refresh_token: newRefreshToken } = response.data.data;
    await setTokens(access_token, newRefreshToken);

    const { useAuthStore } = await import('../store/authStore');
    useAuthStore.getState().setTokens(access_token, newRefreshToken);
  } catch {
    // Silently fail — token refresh will happen on first API call if needed
  }
};

export const startAppStateListener = () => {
  if (appStateSubscription) return;

  appStateSubscription = AppState.addEventListener('change', async (nextAppState: AppStateStatus) => {
    if (nextAppState === 'active') {
      // App came to foreground — proactively refresh expired token
      await refreshTokenSilently();
    }
  });
};

export const stopAppStateListener = () => {
  if (appStateSubscription) {
    appStateSubscription.remove();
    appStateSubscription = null;
  }
};

// ─── Retry handler for the NetworkErrorModal ──────────────
registerRetryHandler((config: any) => {
  const cloned = { ...config };
  // Drop the stale base URL so the request uses the currently resolved one.
  cloned.baseURL = undefined;
  return apiClient(cloned);
});
