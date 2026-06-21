import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

// Retrieve API URL from Expo Env
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.29.241:5000/api';

console.log('Using API URL:', API_URL);

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to include the auth token
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const token = await SecureStore.getItemAsync('auth_token');
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
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

// Add a response interceptor to handle 401 Unauthorized errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Token is invalid or expired, log out automatically
      import('../store/authStore').then(({ useAuthStore }) => {
        useAuthStore.getState().logout();
      });
    }
    return Promise.reject(error);
  }
);
