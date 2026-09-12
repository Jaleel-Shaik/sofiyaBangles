import { api } from "@/src/api";
import { create } from 'zustand';
import { Favorite } from "@/src/api/favorites";

interface FavoriteStore {
  favoriteIds: string[];
  initialized: boolean;
  fetchFavorites: () => Promise<void>;
  toggleFavorite: (productId: string) => Promise<void>;
  removeStaleFavorites: () => Promise<void>;
}

export const useFavoriteStore = create<FavoriteStore>((set, get) => ({
  favoriteIds: [],
  initialized: false,
  fetchFavorites: async () => {
    try {
      const favs: Favorite[] = await api.favorites.getFavorites();
      // Only keep favorites that actually exist (backend filters deleted)
      const ids = favs
        .filter((f) => Boolean(f?.product_id))
        .map((f) => f.product_id);
      const currentIds = get().favoriteIds;
      // Only update if changed to avoid unnecessary re-renders
      if (JSON.stringify(currentIds.sort()) !== JSON.stringify([...ids].sort())) {
        set({ favoriteIds: ids, initialized: true });
      } else {
        set({ initialized: true });
      }
    } catch (error) {
      console.error('Failed to fetch favorites for store', error);
    }
  },
  toggleFavorite: async (productId: string) => {
    const { favoriteIds } = get();
    const isFav = favoriteIds.includes(productId);
    
    if (isFav) {
      set({ favoriteIds: favoriteIds.filter(id => id !== productId) });
      try {
        await api.favorites.removeFavorite(productId);
      } catch {
        set({ favoriteIds: [...favoriteIds] });
      }
    } else {
      set({ favoriteIds: [...favoriteIds, productId] });
      try {
        await api.favorites.addFavorite(productId);
      } catch {
        set({ favoriteIds: favoriteIds.filter(id => id !== productId) });
      }
    }
  },
  removeStaleFavorites: async () => {
    try {
      const favs: Favorite[] = await api.favorites.getFavorites();
      const validIds = new Set(
        favs
          .filter((f) => Boolean(f?.product_id))
          .map((f) => f.product_id)
      );
      const { favoriteIds } = get();
      const staleIds = favoriteIds.filter(id => !validIds.has(id));
      if (staleIds.length > 0) {
        set({ favoriteIds: Array.from(validIds) });
      }
    } catch (error) {
      console.error('Failed to remove stale favorites', error);
    }
  }
}));
