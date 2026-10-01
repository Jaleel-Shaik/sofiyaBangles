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
  category_name?: string;
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

export const unwrapCleanImageUrl = (raw: unknown): string => {
  if (!raw) return '';
  if (typeof raw !== 'string') {
    if (typeof raw === 'object' && raw !== null && 'image_url' in raw) {
      return unwrapCleanImageUrl((raw as any).image_url);
    }
    return '';
  }
  let s = raw.trim();
  while (
    (s.startsWith('[') && s.endsWith(']')) ||
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    if (s.startsWith('[') && s.endsWith(']')) {
      try {
        const parsed = JSON.parse(s);
        if (Array.isArray(parsed) && parsed.length > 0) {
          s = typeof parsed[0] === 'string' ? parsed[0].trim() : String(parsed[0]);
          continue;
        }
      } catch {
        s = s.slice(1, -1).trim();
      }
    } else {
      s = s.slice(1, -1).trim();
    }
  }
  return s.replace(/^[\\"'`]+|[\\"'`]+$/g, '').trim();
};

const sanitizeProduct = (p: any): Product => {
  const cleanCover = unwrapCleanImageUrl(p?.image_url);
  const rawImages = Array.isArray(p?.images) ? p.images : (cleanCover ? [cleanCover] : []);
  const images: string[] = [];

  for (const item of rawImages) {
    if (typeof item === 'string') {
      const trimmed = item.trim();
      if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        try {
          const parsed = JSON.parse(trimmed);
          if (Array.isArray(parsed)) {
            parsed.forEach((x) => {
              const u = unwrapCleanImageUrl(x);
              if (u) images.push(u);
            });
            continue;
          }
        } catch {
          // ignore
        }
      }
      const u = unwrapCleanImageUrl(trimmed);
      if (u) images.push(u);
    } else if (item && typeof item === 'object') {
      const u = unwrapCleanImageUrl(item?.image_url || item?.url);
      if (u) images.push(u);
    }
  }

  const finalCover = cleanCover || (images.length > 0 ? images[0] : '');

  return {
    ...p,
    id: String(p?.id || ''),
    unique_code: (p?.unique_code || '').replace(/^#+/, '').trim().toUpperCase(),
    product_name: p?.product_name || 'Bangle',
    description: p?.description || '',
    price: typeof p?.price === 'number' ? p.price : Number(p?.price) || 0,
    image_url: finalCover,
    images: images.length > 0 ? images : (finalCover ? [finalCover] : []),
    category_id: p?.category_id || '',
    category_name: p?.category_name || '',
    quantity: typeof p?.quantity === 'number' ? p.quantity : Number(p?.quantity) || 0,
    is_active: p?.is_active !== false,
    has_variants: Boolean(p?.has_variants),
    variants: Array.isArray(p?.variants) ? p.variants : [],
    accepts_custom_size: Boolean(p?.accepts_custom_size),
    model_type_id: p?.model_type_id || '',
  };
};

export interface ProductFilterParams {
  page?: number;
  limit?: number;
  categoryId?: string;
  modelTypeId?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  search?: string;
  sort?: 'newest' | 'rating';
}

export const getProducts = async (
  pageOrParams: number | ProductFilterParams = 1,
  limitParam = 10,
  categoryIdParam?: string,
  searchParam?: string
): Promise<{ products: Product[]; total: number }> => {
  try {
    let params: ProductFilterParams = {};
    if (typeof pageOrParams === 'object' && pageOrParams !== null) {
      params = pageOrParams;
    } else {
      params = {
        page: pageOrParams,
        limit: limitParam,
        categoryId: categoryIdParam,
        search: searchParam,
      };
    }

    const page = params.page || 1;
    const limit = params.limit || 10;
    let url = `${API_ENDPOINTS.PRODUCTS.BASE}?page=${page}&limit=${limit}`;

    if (params.categoryId) url += `&category_id=${encodeURIComponent(params.categoryId)}`;
    if (params.modelTypeId) url += `&model_type_id=${encodeURIComponent(params.modelTypeId)}`;
    if (params.minPrice !== undefined && !isNaN(params.minPrice)) url += `&min_price=${params.minPrice}`;
    if (params.maxPrice !== undefined && !isNaN(params.maxPrice)) url += `&max_price=${params.maxPrice}`;
    if (params.inStock) url += `&in_stock=true`;
    if (params.sort) url += `&sort=${encodeURIComponent(params.sort)}`;
    if (params.search && params.search.trim()) url += `&search=${encodeURIComponent(params.search.trim())}`;

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
