import { API_ENDPOINTS } from "./endpoints";
import { apiClient } from './client';

export interface Favorite {
  id: string;
  user_id: string;
  product_id: string;
  created_at: string;
  product?: any;
}

export const getFavorites = async () => {
  try {
    const res = await apiClient.get('favorites');
    return res.data.data as Favorite[];
  } catch (error) {
    console.error('Error fetching favorites', error);
    return [];
  }
};

export const addFavorite = async (productId: string) => {
  try {
    const res = await apiClient.post(API_ENDPOINTS.USERS.FAVORITE_BY_ID(productId));
    return res.data;
  } catch (error: any) {
    throw new Error(error?.response?.data?.message || error.message || 'Failed to add favorite');
  }
};

export const removeFavorite = async (productId: string) => {
  try {
    const res = await apiClient.delete(API_ENDPOINTS.USERS.FAVORITE_BY_ID(productId));
    return res.data;
  } catch (error: any) {
    throw new Error(error?.response?.data?.message || error.message || 'Failed to remove favorite');
  }
};
