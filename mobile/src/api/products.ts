import { API_ENDPOINTS } from './endpoints';
import { apiClient } from './client';

export interface ProductImage {
  id?: string;
  image_url: string;
  is_primary?: boolean;
  display_order?: number;
}

export interface ProductVariant {
  id?: string;
  size?: string;
  color?: string;
  price: number;
  stock_quantity?: number;
  quantity: number;
  sku?: string;
}

export interface Product {
  id: string;
  unique_code: string;
  product_name: string;
  description: string;
  price: number;
  image_url: string;
  images?: string[];
  category_id: string;
  quantity: number;
  likes?: number;
  rating?: number;
  reviews?: number;
  is_active: boolean;
  status?: 'draft' | 'active' | 'out_of_stock' | 'archived';
  deleted_at?: string | null;
  has_variants?: boolean;
  variants?: ProductVariant[];
  accepts_custom_size?: boolean;
  custom_size_price?: number | string;
  model_type_id: string;
  model_type_name?: string;
  created_at?: string;
  updated_at?: string;
}

export const getProducts = async (
  page = 1,
  limit = 10,
  categoryId?: string,
  search?: string
): Promise<{ products: Product[]; total: number }> => {
  try {
    let url = `${API_ENDPOINTS.PRODUCTS.BASE}?page=${page}&limit=${limit}`;
    if (categoryId) url += `&category_id=${categoryId}`;
    if (search && search.trim()) url += `&search=${encodeURIComponent(search.trim())}`;

    const res = await apiClient.get(url);
    const payload: Product[] = Array.isArray(res.data?.data) ? res.data.data : [];
    const total = typeof res.data?.pagination?.total === 'number' ? res.data.pagination.total : payload.length;
    return { products: payload, total };
  } catch (error) {
    console.error('Error fetching products', error);
    return { products: [], total: 0 };
  }
};

export const getRecommendedProducts = async (
  page = 1,
  limit = 10,
  search?: string
): Promise<{ products: Product[]; total: number }> => {
  try {
    let url = `${API_ENDPOINTS.PRODUCTS.RECOMMENDED}?page=${page}&limit=${limit}`;
    if (search && search.trim()) {
      url += `&search=${encodeURIComponent(search.trim())}`;
    }

    const res = await apiClient.get(url);
    const payload: Product[] = Array.isArray(res.data?.data) ? res.data.data : [];
    const total = typeof res.data?.pagination?.total === 'number' ? res.data.pagination.total : payload.length;

    // Resilient fallback: If recommendations endpoint returns 0 (e.g. cold start with no interaction history), fallback to getProducts
    if (payload.length === 0 && !search) {
      return getProducts(page, limit);
    }

    return { products: payload, total };
  } catch (error) {
    console.warn('Falling back to standard products for recommendations:', error);
    return getProducts(page, limit, undefined, search);
  }
};

export const getProductById = async (id: string): Promise<Product | null> => {
  try {
    const res = await apiClient.get(API_ENDPOINTS.PRODUCTS.BY_ID(id));
    return (res.data?.data || null) as Product | null;
  } catch (error) {
    console.error(`Error fetching product ${id}`, error);
    return null;
  }
};

export const getFeaturedProducts = async (): Promise<Product[]> => {
  try {
    const res = await apiClient.get(`${API_ENDPOINTS.PRODUCTS.BASE}?featured=true`);
    return (res.data?.data || []) as Product[];
  } catch (error) {
    console.error('Error fetching featured products', error);
    return [];
  }
};

export const getNewArrivals = async (
  daysAgo = 30,
  page = 1,
  limit = 20
): Promise<{ products: Product[]; total: number }> => {
  try {
    const url = `${API_ENDPOINTS.PRODUCTS.NEW_ARRIVALS}?daysAgo=${daysAgo}&page=${page}&limit=${limit}`;
    const res = await apiClient.get(url);
    const payload: Product[] = Array.isArray(res.data?.data) ? res.data.data : [];
    const total = typeof res.data?.pagination?.total === 'number' ? res.data.pagination.total : payload.length;

    if (payload.length === 0) {
      return getProducts(page, limit);
    }

    return { products: payload, total };
  } catch (error) {
    console.warn('Falling back to standard products for new arrivals:', error);
    return getProducts(page, limit);
  }
};

export const getProductsByCategory = async (categoryId: string): Promise<Product[]> => {
  try {
    const res = await apiClient.get(`${API_ENDPOINTS.PRODUCTS.BASE}?category_id=${categoryId}`);
    return (res.data?.data || []) as Product[];
  } catch (error) {
    console.error(`Error fetching products for category ${categoryId}`, error);
    return [];
  }
};
