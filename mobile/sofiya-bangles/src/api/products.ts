import { apiClient } from './client';

export interface Product {
  id: string;
  product_name: string;
  description: string;
  price: number;
  image_url: string;
  category_id: string;
  quantity: number;
  is_active: boolean;
}

export const getProducts = async (page = 1, limit = 10, categoryId?: string, search?: string) => {
  try {
    const params: any = { page, limit };
    if (categoryId) params.category_id = categoryId;
    if (search) params.search = search;
    
    const response = await apiClient.get('/products', { params });
    return response.data.data; // Array of products
  } catch (error) {
    console.error('Error fetching products', error);
    return [];
  }
};

export const getProductById = async (id: string) => {
  try {
    const response = await apiClient.get(`/products/${id}`);
    return response.data.data;
  } catch (error) {
    console.error(`Error fetching product ${id}`, error);
    return null;
  }
};
