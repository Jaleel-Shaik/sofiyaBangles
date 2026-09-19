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

const sanitizeProduct = (p: any): Product => ({
  ...p,
  id: String(p?.id || ''),
  unique_code: p?.unique_code || '',
  product_name: p?.product_name || 'Bangle',
  description: p?.description || '',
  price: typeof p?.price === 'number' ? p.price : Number(p?.price) || 0,
  image_url: p?.image_url || '',
  images: Array.isArray(p?.images) ? p.images : (p?.image_url ? [p.image_url] : []),
  category_id: p?.category_id || '',
  quantity: typeof p?.quantity === 'number' ? p.quantity : Number(p?.quantity) || 0,
  is_active: p?.is_active !== false,
  has_variants: Boolean(p?.has_variants),
  variants: Array.isArray(p?.variants) ? p.variants : [],
  accepts_custom_size: Boolean(p?.accepts_custom_size),
  model_type_id: p?.model_type_id || '',
});

export const getProducts = async (
  page = 1,
  limit = 10,
  categoryId?: string,
  search?: string
): Promise<{ products: Product[]; total: number }> => {
  try {
    let url = `${API_ENDPOINTS.PRODUCTS.BASE}?page=${page}&limit=${limit}`;
    if (categoryId) url += `&category_id=${encodeURIComponent(categoryId)}`;
    if (search && search.trim()) url += `&search=${encodeURIComponent(search.trim())}`;

    const res = await apiClient.get(url);
    const rawData = res.data?.data ?? res.data?.products ?? (Array.isArray(res.data) ? res.data : []);
    const payload: any[] = Array.isArray(rawData) ? rawData : [];
    const products: Product[] = payload
      .filter((p) => Boolean(p && typeof p === 'object'))
      .map(sanitizeProduct);
    const total = typeof res.data?.pagination?.total === 'number'
      ? res.data.pagination.total
      : (typeof res.data?.total === 'number' ? res.data.total : products.length);
    return { products, total };
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
    const rawData = res.data?.data ?? (Array.isArray(res.data) ? res.data : []);
    const payload: any[] = Array.isArray(rawData) ? rawData : [];
    const products: Product[] = payload
      .filter((p) => Boolean(p && typeof p === 'object'))
      .map(sanitizeProduct);
    const total = typeof res.data?.pagination?.total === 'number' ? res.data.pagination.total : products.length;

    // Resilient fallback: If recommendations endpoint returns 0, fallback to getProducts
    if (products.length === 0 && !search) {
      return getProducts(page, limit);
    }

    return { products, total };
  } catch (error) {
    console.warn('Falling back to standard products for recommendations:', error);
    return getProducts(page, limit, undefined, search);
  }
};

export const getProductById = async (id: string): Promise<Product | null> => {
  try {
    const res = await apiClient.get(API_ENDPOINTS.PRODUCTS.BY_ID(id));
    const raw = res.data?.data ?? (res.data && typeof res.data === 'object' && !Array.isArray(res.data) ? res.data : null);
    return raw ? sanitizeProduct(raw) : null;
  } catch (error) {
    console.error(`Error fetching product ${id}`, error);
    return null;
  }
};

export const getFeaturedProducts = async (): Promise<Product[]> => {
  try {
    const res = await apiClient.get(`${API_ENDPOINTS.PRODUCTS.BASE}?featured=true`);
    const rawData = res.data?.data ?? (Array.isArray(res.data) ? res.data : []);
    const payload: any[] = Array.isArray(rawData) ? rawData : [];
    return payload.filter((p) => Boolean(p && typeof p === 'object')).map(sanitizeProduct);
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
    const rawData = res.data?.data ?? (Array.isArray(res.data) ? res.data : []);
    const payload: any[] = Array.isArray(rawData) ? rawData : [];
    const products: Product[] = payload
      .filter((p) => Boolean(p && typeof p === 'object'))
      .map(sanitizeProduct);
    const total = typeof res.data?.pagination?.total === 'number' ? res.data.pagination.total : products.length;

    if (products.length === 0) {
      return getProducts(page, limit);
    }

    return { products, total };
  } catch (error) {
    console.warn('Falling back to standard products for new arrivals:', error);
    return getProducts(page, limit);
  }
};

export const getProductsByCategory = async (categoryId: string): Promise<Product[]> => {
  try {
    const res = await apiClient.get(`${API_ENDPOINTS.PRODUCTS.BASE}?category_id=${encodeURIComponent(categoryId)}`);
    const rawData = res.data?.data ?? (Array.isArray(res.data) ? res.data : []);
    const payload: any[] = Array.isArray(rawData) ? rawData : [];
    return payload.filter((p) => Boolean(p && typeof p === 'object')).map(sanitizeProduct);
  } catch (error) {
    console.error(`Error fetching products for category ${categoryId}`, error);
    return [];
  }
};
