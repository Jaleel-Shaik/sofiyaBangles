import { apiClient } from './client';
import { useAuthStore } from '../store/authStore';

export const login = async (email: string, password: string) => {
  try {
    const response = await apiClient.post('/auth/login', { email, password });
    
    if (response.data.success) {
      const { user, token } = response.data.data;
      await useAuthStore.getState().login(user, token);
      return response.data;
    }
  } catch (error: any) {
    const data = error.response?.data;
    if (data?.errors && data.errors.length > 0) {
      const msgs = data.errors.map((e: any) => e.message).join('\n');
      throw new Error(`Validation failed:\n${msgs}`);
    }
    throw new Error(data?.message || 'Login failed');
  }
};

export const register = async (email: string, password: string, fullName: string) => {
  try {
    const response = await apiClient.post('/auth/register', { 
      email, 
      password, 
      full_name: fullName 
    });
    
    if (response.data.success) {
      const { user, token } = response.data.data;
      await useAuthStore.getState().login(user, token);
      return response.data;
    }
  } catch (error: any) {
    const data = error.response?.data;
    if (data?.errors && data.errors.length > 0) {
      const msgs = data.errors.map((e: any) => e.message).join('\n');
      throw new Error(`Validation failed:\n${msgs}`);
    }
    throw new Error(data?.message || 'Registration failed');
  }
};
