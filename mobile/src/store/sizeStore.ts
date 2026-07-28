import { create } from 'zustand';
import { UserSizePreference, getSizePreferences, createSizePreference, updateSizePreference, deleteSizePreference } from '../api/sizes';
import { useAuthStore } from './authStore';

interface SizeState {
  preferences: UserSizePreference[];
  loading: boolean;
  error: string | null;
  
  fetchPreferences: () => Promise<void>;
  addPreference: (data: Omit<UserSizePreference, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<void>;
  editPreference: (id: string, data: Partial<Omit<UserSizePreference, 'id' | 'user_id' | 'category_id' | 'created_at'>>) => Promise<void>;
  removePreference: (id: string) => Promise<void>;
  setCategoryPreference: (categoryId: string, data: Omit<UserSizePreference, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'category_id'>) => Promise<void>;
  clearPreferences: () => void;
}

export const useSizeStore = create<SizeState>((set, get) => ({
  preferences: [],
  loading: false,
  error: null,

  fetchPreferences: async () => {
    const { user } = useAuthStore.getState();
    if (!user) return;
    
    set({ loading: true, error: null });
    try {
      const prefs = await getSizePreferences(user.id);
      set({ preferences: prefs, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  addPreference: async (data) => {
    const { user } = useAuthStore.getState();
    if (!user) throw new Error("Must be logged in to save sizes");
    
    try {
      const newPref = await createSizePreference(user.id, data);
      set(state => ({
        preferences: [...state.preferences, newPref]
      }));
    } catch (err: any) {
      throw err;
    }
  },

  editPreference: async (id, data) => {
    try {
      await updateSizePreference(id, data);
      set(state => ({
        preferences: state.preferences.map(p => 
          p.id === id ? { ...p, ...data, updated_at: new Date().toISOString() } : p
        )
      }));
    } catch (err: any) {
      throw err;
    }
  },

  removePreference: async (id) => {
    try {
      await deleteSizePreference(id);
      set(state => ({
        preferences: state.preferences.filter(p => p.id !== id)
      }));
    } catch (err: any) {
      throw err;
    }
  },

  setCategoryPreference: async (categoryId, data) => {
    const state = get();
    const existing = state.preferences.find(p => p.category_id === categoryId);
    
    if (existing) {
      await state.editPreference(existing.id, data);
    } else {
      await state.addPreference({
        ...data,
        category_id: categoryId,
      });
    }
  },
  
  clearPreferences: () => set({ preferences: [] })
}));
