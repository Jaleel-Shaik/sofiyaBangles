import { create } from 'zustand';
import { api } from '@/src/api';
import type { Product, ProductFilterParams } from '@/src/api/products';
import type { Category } from '@/src/api/categories';
import type { ModelType } from '@/src/api/modelTypes';

export type PriceBucket = 'all' | 'under_500' | '500_1000' | '1000_2000' | 'above_2000';

export interface FilterState {
  categoryId: string;
  modelTypeId: string;
  priceBucket: PriceBucket;
  minPrice?: number;
  maxPrice?: number;
  inStockOnly: boolean;
  sortBy: 'newest' | 'rating';
}

const DEFAULT_FILTERS: FilterState = {
  categoryId: 'all',
  modelTypeId: 'all',
  priceBucket: 'all',
  minPrice: undefined,
  maxPrice: undefined,
  inStockOnly: false,
  sortBy: 'newest',
};

export interface ProductSearchStore {
  searchQuery: string;
  appliedFilters: FilterState;
  draftFilters: FilterState;
  products: Product[];
  total: number;
  loading: boolean;
  refreshing: boolean;
  categories: Category[];
  modelTypes: ModelType[];
  isFilterDrawerOpen: boolean;

  // Actions
  setSearchQuery: (query: string) => void;
  setDraftFilter: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void;
  openFilterDrawer: () => void;
  closeFilterDrawer: () => void;
  applyDraftFilters: () => Promise<void>;
  resetDraftFilters: () => void;
  clearAllFilters: () => Promise<void>;
  setSortBy: (sort: 'newest' | 'rating') => Promise<void>;
  fetchMetadata: () => Promise<void>;
  fetchProducts: (isRefresh?: boolean) => Promise<void>;
}

export const useProductSearchStore = create<ProductSearchStore>((set, get) => ({
  searchQuery: '',
  appliedFilters: { ...DEFAULT_FILTERS },
  draftFilters: { ...DEFAULT_FILTERS },
  products: [],
  total: 0,
  loading: false,
  refreshing: false,
  categories: [],
  modelTypes: [],
  isFilterDrawerOpen: false,

  setSearchQuery: (query: string) => {
    set({ searchQuery: query });
  },

  setDraftFilter: (key, value) => {
    set((state) => ({
      draftFilters: {
        ...state.draftFilters,
        [key]: value,
      },
    }));
  },

  openFilterDrawer: () => {
    const current = get().appliedFilters;
    set({
      draftFilters: { ...current },
      isFilterDrawerOpen: true,
    });
  },

  closeFilterDrawer: () => {
    set({ isFilterDrawerOpen: false });
  },

  applyDraftFilters: async () => {
    const draft = { ...get().draftFilters };
    set({
      appliedFilters: draft,
      isFilterDrawerOpen: false,
    });
    await get().fetchProducts(true);
  },

  resetDraftFilters: () => {
    set({ draftFilters: { ...DEFAULT_FILTERS } });
  },

  clearAllFilters: async () => {
    set({
      appliedFilters: { ...DEFAULT_FILTERS },
      draftFilters: { ...DEFAULT_FILTERS },
    });
    await get().fetchProducts(true);
  },

  setSortBy: async (sort: 'newest' | 'rating') => {
    set((state) => ({
      appliedFilters: { ...state.appliedFilters, sortBy: sort },
      draftFilters: { ...state.draftFilters, sortBy: sort },
    }));
    await get().fetchProducts(true);
  },

  fetchMetadata: async () => {
    try {
      const [cats, models] = await Promise.all([
        api.categories.getCategories(),
        api.modelTypes.getModelTypes(),
      ]);
      set({
        categories: Array.isArray(cats) ? cats : [],
        modelTypes: Array.isArray(models) ? models : [],
      });
    } catch (err) {
      console.error('Failed to fetch search metadata', err);
    }
  },

  fetchProducts: async (isRefresh = false) => {
    const { searchQuery, appliedFilters } = get();

    if (isRefresh) {
      set({ refreshing: true });
    } else {
      set({ loading: true });
    }

    try {
      // Translate price bucket to numeric min/max
      let minPrice = appliedFilters.minPrice;
      let maxPrice = appliedFilters.maxPrice;

      if (appliedFilters.priceBucket === 'under_500') {
        minPrice = 0;
        maxPrice = 500;
      } else if (appliedFilters.priceBucket === '500_1000') {
        minPrice = 500;
        maxPrice = 1000;
      } else if (appliedFilters.priceBucket === '1000_2000') {
        minPrice = 1000;
        maxPrice = 2000;
      } else if (appliedFilters.priceBucket === 'above_2000') {
        minPrice = 2000;
        maxPrice = undefined;
      }

      const params: ProductFilterParams = {
        page: 1,
        limit: 50,
        search: searchQuery.trim() || undefined,
        categoryId: appliedFilters.categoryId !== 'all' ? appliedFilters.categoryId : undefined,
        modelTypeId: appliedFilters.modelTypeId !== 'all' ? appliedFilters.modelTypeId : undefined,
        minPrice: minPrice,
        maxPrice: maxPrice,
        inStock: appliedFilters.inStockOnly ? true : undefined,
        sort: appliedFilters.sortBy,
      };

      const res = await api.products.getProducts(params);

      set({
        products: res.products || [],
        total: res.total || 0,
      });
    } catch (error) {
      console.error('Error in productSearchStore.fetchProducts:', error);
      set({ products: [], total: 0 });
    } finally {
      set({ loading: false, refreshing: false });
    }
  },
}));
