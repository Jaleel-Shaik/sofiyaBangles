import { apiClient } from './client';

export interface Favorite {
  id: string;
  user_id: string;
  product_id: string;
  created_at: string;
  product?: any; // the joined product
}

export const getFavorites = async () => {
  try {
    const response = await apiClient.get('/favorites');
    return response.data.data; // Array of favorites
  } catch (error) {
    console.error('Error fetching favorites', error);
    return [];
  }
};

export const addFavorite = async (productId: string) => {
  try {
    const response = await apiClient.post(`/favorites/${productId}`);
    return response.data;
  } catch (error) {
    console.error('Error adding favorite', error);
    throw error;
  }
};

export const removeFavorite = async (productId: string) => {
  try {
    const response = await apiClient.delete(`/favorites/${productId}`);
    return response.data;
  } catch (error) {
    console.error('Error removing favorite', error);
    throw error;
  }
};
