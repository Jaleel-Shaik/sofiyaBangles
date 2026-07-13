import { apiClient } from './client';

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
  has_variants?: boolean;
  variants?: any[];
  accepts_custom_size?: boolean;
  custom_size_price?: number | string;
  created_at?: string;
  updated_at?: string;
}

export const getProducts = async (page = 1, limit = 10, categoryId?: string, search?: string) => {
  try {
    let url = `products?page=${page}&limit=${limit}`;
    if (categoryId) url += `&category_id=${categoryId}`;
    if (search) url += `&search=${search}`;
    
    const res = await apiClient.get(url);
    return { products: res.data.data, total: res.data.pagination.total };
  } catch (error) {
    console.error('Error fetching products', error);
    return { products: [], total: 0 };
  }
};

export const getProductById = async (id: string) => {
  try {
    const res = await apiClient.get(`products/${id}`);
    return res.data.data;
  } catch (error) {
    console.error(`Error fetching product ${id}`, error);
    return null;
  }
};

export const getRecommendedProducts = async (page = 1, limit = 10, search?: string) => {
  try {
    let url = `products/recommended?page=${page}&limit=${limit}`;
    if (search) url += `&search=${search}`;
    
    const res = await apiClient.get(url);
    return { products: res.data.data, total: res.data.pagination.total };
  } catch (error) {
    console.error('Error fetching recommended products', error);
    return { products: [], total: 0 };
  }
};

export const getNewArrivals = async (daysAgo: number, page = 1, limit = 20) => {
  try {
    let url = `products/new-arrivals?daysAgo=${daysAgo}&page=${page}&limit=${limit}`;
    const res = await apiClient.get(url);
    return { products: res.data.data, total: res.data.pagination.total };
  } catch (error) {
    console.error('Error fetching new arrivals', error);
    return { products: [], total: 0 };
  }
};
