import { API_ENDPOINTS } from "./endpoints";
import { apiClient } from './client';

export interface Category {
  id: string;
  category_name: string;
  name?: string;
  image_url: string;
  display_order: number;
  is_active: boolean;
  model_type_id: string;
  size_type?: 'none' | 'standard' | 'custom' | 'both';
  standard_sizes?: string[];
  custom_measurement_fields?: string[];
}

export const getCategories = async (modelTypeId?: string): Promise<Category[]> => {
  try {
    const res = await apiClient.get(API_ENDPOINTS.CATEGORIES.BASE, { params: { model_type_id: modelTypeId } });
    const categories: Category[] = res.data?.data || [];
    return categories.map(c => ({
      ...c,
      name: c.name || c.category_name,
    }));
  } catch (error) {
    console.error('Error fetching categories', error);
    return [];
  }
};

export const createCategory = async (categoryName: string): Promise<Category> => {
  try {
    const res = await apiClient.post(API_ENDPOINTS.CATEGORIES.BASE, { category_name: categoryName });
    return res.data.data as Category;
  } catch (error: unknown) {
    console.error('Error creating category', error);
    const message = error instanceof Error ? error.message : 'Failed to create category';
    throw new Error(message);
  }
};
