import { apiClient } from './client';

export interface Category {
  id: string;
  category_name: string;
  image_url: string;
  display_order: number;
  is_active: boolean;
  model_type_id?: string;
  size_type?: 'none' | 'standard' | 'custom' | 'both';
  standard_sizes?: string[];
  custom_measurement_fields?: string[];
}

export const getCategories = async () => {
  try {
    const res = await apiClient.get('categories');
    return res.data.data as Category[];
  } catch (error) {
    console.error('Error fetching categories', error);
    return [];
  }
};

export const createCategory = async (categoryName: string): Promise<Category> => {
  try {
    const res = await apiClient.post('/categories', { category_name: categoryName });
    return res.data.data as Category;
  } catch (error: any) {
    console.error('Error creating category', error);
    throw new Error(error?.response?.data?.message || error.message || 'Failed to create category');
  }
};
