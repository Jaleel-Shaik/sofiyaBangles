import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { apiClient } from '../api/client';

interface User {
  id: string;
  email: string;
  role: string;
  full_name?: string;
  phone?: string;
  avatar_url?: string;
  address?: string;
  size_preference?: string;
  language?: string;
  is_2fa_enabled?: boolean;
}

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  is2faPending: boolean;
  otpPendingToken: string | null;
  setupRequired: boolean;
  qrCodeUrl: string | null;
  
  login: (user: User, token: string, refreshToken?: string) => Promise<void>;
  set2faPending: (data: { otp_pending_token: string; setup_required: boolean; qr_code_url?: string | null }) => void;
  clear2faPending: () => void;
  logout: () => Promise<void>;
  forceLogout: () => Promise<void>;
  restoreToken: () => Promise<void>;
  updateUser: (data: Partial<User>) => Promise<void>;
  setTokens: (accessToken: string, refreshToken: string) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  refreshToken: null,
  isLoading: true,
  is2faPending: false,
  otpPendingToken: null,
  setupRequired: false,
  qrCodeUrl: null,

  login: async (user: User, token: string, refreshToken?: string) => {
    try {
      await SecureStore.setItemAsync('auth_token', token);
      if (refreshToken) {
        await SecureStore.setItemAsync('refresh_token', refreshToken);
      }
      await SecureStore.setItemAsync('auth_user', JSON.stringify(user));
      set({ 
        user, 
        token, 
        refreshToken: refreshToken || null,
        is2faPending: false,
        otpPendingToken: null,
        setupRequired: false,
        qrCodeUrl: null,
      });
    } catch (error) {
      console.error('Error storing auth info', error);
    }
  },

  set2faPending: (data) => {
    set({
      is2faPending: true,
      otpPendingToken: data.otp_pending_token,
      setupRequired: data.setup_required,
      qrCodeUrl: data.qr_code_url || null,
    });
  },

  clear2faPending: () => {
    set({
      is2faPending: false,
      otpPendingToken: null,
      setupRequired: false,
      qrCodeUrl: null,
    });
  },

  logout: async () => {
    try {
      // Call backend logout with refresh token and session
      const { refreshToken } = get();
      const sessionId = await SecureStore.getItemAsync('session_id');
      
      try {
        await apiClient.post('/auth/logout', {
          refresh_token: refreshToken,
          session_id: sessionId,
        });
      } catch (apiError) {
        // Backend logout is best-effort; proceed with local cleanup
        console.error('Backend logout error:', apiError);
      }
      
      await SecureStore.deleteItemAsync('auth_token');
      await SecureStore.deleteItemAsync('refresh_token');
      await SecureStore.deleteItemAsync('auth_user');
      await SecureStore.deleteItemAsync('session_id');
      
      set({ 
        user: null, 
        token: null, 
        refreshToken: null,
        is2faPending: false,
        otpPendingToken: null,
        setupRequired: false,
        qrCodeUrl: null,
      });
    } catch (error) {
      console.error('Error removing auth info', error);
    }
  },

  forceLogout: async () => {
    try {
      await SecureStore.deleteItemAsync('auth_token');
      await SecureStore.deleteItemAsync('refresh_token');
      await SecureStore.deleteItemAsync('auth_user');
      await SecureStore.deleteItemAsync('session_id');
      
      set({ 
        user: null, 
        token: null, 
        refreshToken: null,
        is2faPending: false,
        otpPendingToken: null,
        setupRequired: false,
        qrCodeUrl: null,
      });
    } catch (error) {
      console.error('Error during force logout:', error);
    }
  },

  restoreToken: async () => {
    try {
      const token = await SecureStore.getItemAsync('auth_token');
      const refreshToken = await SecureStore.getItemAsync('refresh_token');
      const userStr = await SecureStore.getItemAsync('auth_user');

      if (token && userStr) {
        try {
          const parsedUser = JSON.parse(userStr);
          set({ 
            token, 
            refreshToken: refreshToken || null,
            user: parsedUser, 
            isLoading: false,
          });
        } catch (parseError) {
          console.error('Corrupted user data in SecureStore, cleaning up...', parseError);
          await SecureStore.deleteItemAsync('auth_token');
          await SecureStore.deleteItemAsync('refresh_token');
          await SecureStore.deleteItemAsync('auth_user');
          set({ 
            token: null, 
            refreshToken: null,
            user: null, 
            isLoading: false,
          });
        }
      } else {
        set({ isLoading: false });
      }
    } catch (error) {
      console.error('Error restoring auth info', error);
      try {
        await SecureStore.deleteItemAsync('auth_token');
        await SecureStore.deleteItemAsync('refresh_token');
        await SecureStore.deleteItemAsync('auth_user');
      } catch (e) {}
      set({ 
        token: null,
        refreshToken: null,
        user: null,
        isLoading: false,
      });
    }
  },

  updateUser: async (data: Partial<User>) => {
    const { user } = get();
    if (!user) return;

    const updatedUser = { ...user, ...data };
    try {
      await SecureStore.setItemAsync('auth_user', JSON.stringify(updatedUser));
      set({ user: updatedUser });
    } catch (error) {
      console.error('Error updating local user data', error);
    }
  },

  setTokens: async (accessToken: string, newRefreshToken: string) => {
    try {
      await SecureStore.setItemAsync('auth_token', accessToken);
      await SecureStore.setItemAsync('refresh_token', newRefreshToken);
      set({ token: accessToken, refreshToken: newRefreshToken });
    } catch (error) {
      console.error('Error updating tokens:', error);
    }
  },
}));
