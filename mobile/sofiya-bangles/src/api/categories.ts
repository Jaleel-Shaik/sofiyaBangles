import { apiClient } from './client';

export interface Category {
  id: string;
  category_name: string;
  image_url: string;
  display_order: number;
  is_active: boolean;
}

export const getCategories = async () => {
  try {
    const response = await apiClient.get('/categories');
    return response.data.data; // Array of categories
  } catch (error) {
    console.error('Error fetching categories', error);
    return [];
  }
};
