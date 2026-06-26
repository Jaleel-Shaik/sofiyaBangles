import { create } from 'zustand';
import { getFavorites, addFavorite, removeFavorite } from '../api/favorites';

interface FavoriteStore {
  favoriteIds: string[];
  initialized: boolean;
  fetchFavorites: () => Promise<void>;
  toggleFavorite: (productId: string) => Promise<void>;
}

export const useFavoriteStore = create<FavoriteStore>((set, get) => ({
  favoriteIds: [],
  initialized: false,
  fetchFavorites: async () => {
    try {
      const favs = await getFavorites();
      const ids = favs.map((f: any) => f.product_id);
      set({ favoriteIds: ids, initialized: true });
    } catch (error) {
      console.error('Failed to fetch favorites for store', error);
    }
  },
  toggleFavorite: async (productId: string) => {
    const { favoriteIds } = get();
    const isFav = favoriteIds.includes(productId);
    
    // Optimistic UI update
    if (isFav) {
      set({ favoriteIds: favoriteIds.filter(id => id !== productId) });
      try {
        await removeFavorite(productId);
      } catch (error) {
        // Revert on error
        set({ favoriteIds: [...favoriteIds] });
      }
    } else {
      set({ favoriteIds: [...favoriteIds, productId] });
      try {
        await addFavorite(productId);
      } catch (error) {
        // Revert on error
        set({ favoriteIds: favoriteIds.filter(id => id !== productId) });
      }
    }
  }
}));
