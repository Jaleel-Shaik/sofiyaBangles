import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

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
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (user: User, token: string) => Promise<void>;
  logout: () => Promise<void>;
  restoreToken: () => Promise<void>;
  updateUser: (data: Partial<User>) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isLoading: true,
  
  login: async (user: User, token: string) => {
    try {
      await SecureStore.setItemAsync('auth_token', token);
      await SecureStore.setItemAsync('auth_user', JSON.stringify(user));
      set({ user, token });
    } catch (error) {
      console.error('Error storing auth info', error);
    }
  },
  
  logout: async () => {
    try {
      await SecureStore.deleteItemAsync('auth_token');
      await SecureStore.deleteItemAsync('auth_user');
      set({ user: null, token: null });
    } catch (error) {
      console.error('Error removing auth info', error);
    }
  },
  
  restoreToken: async () => {
    try {
      const token = await SecureStore.getItemAsync('auth_token');
      const userStr = await SecureStore.getItemAsync('auth_user');
      
      if (token && userStr) {
        try {
          const parsedUser = JSON.parse(userStr);
          set({ token, user: parsedUser, isLoading: false });
        } catch (parseError) {
          console.error('Corrupted user data in SecureStore, cleaning up...', parseError);
          await SecureStore.deleteItemAsync('auth_token');
          await SecureStore.deleteItemAsync('auth_user');
          set({ token: null, user: null, isLoading: false });
        }
      } else {
        set({ isLoading: false });
      }
    } catch (error) {
      console.error('Error restoring auth info', error);
      try {
        await SecureStore.deleteItemAsync('auth_token');
        await SecureStore.deleteItemAsync('auth_user');
      } catch (e) {}
      set({ token: null, user: null, isLoading: false });
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
  }
}));
