import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { AppState, AppStateStatus } from 'react-native';

// Retrieve API URL from Expo Env
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.29.241:5000/api';

console.log('Using API URL:', API_URL);

export const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 15000, // 15 seconds timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

// ─── Token Refresh State ─────────────────────────────────
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: any) => void;
}> = [];

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
    return config;
  },
  (error) => {
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
    const isAuthRoute = url.includes('/auth/login') || 
      url.includes('/auth/register') || 
      url.includes('/auth/send-otp') || 
      url.includes('/auth/verify-otp') ||
      url.includes('/auth/verify-2fa') ||
      url.includes('/auth/refresh-token');

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

        const response = await axios.post(`${API_URL}/auth/refresh-token`, {
          refresh_token: refreshToken,
        });

        const { access_token, refresh_token: newRefreshToken } = response.data.data;
        
        await setTokens(access_token, newRefreshToken);
        
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

export const startAppStateListener = () => {
  if (appStateSubscription) return;
  
  appStateSubscription = AppState.addEventListener('change', async (nextAppState: AppStateStatus) => {
    if (nextAppState === 'background' || nextAppState === 'inactive') {
      // App is going to background - optionally track this
      console.log('📱 App moved to background');
    }
  });
};

export const stopAppStateListener = () => {
  if (appStateSubscription) {
    appStateSubscription.remove();
    appStateSubscription = null;
  }
};
