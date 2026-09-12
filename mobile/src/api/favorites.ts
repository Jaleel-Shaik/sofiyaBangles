import axios from "axios";
import { API_ENDPOINTS } from "./endpoints";
import { apiClient } from './client';
import { Product } from "./products";

export interface Favorite {
  id: string;
  user_id: string;
  product_id: string;
  created_at: string;
  product?: Product;
}

export const getFavorites = async (): Promise<Favorite[]> => {
  try {
    const res = await apiClient.get(API_ENDPOINTS.FAVORITES.BASE);
    return (res.data?.data || []) as Favorite[];
  } catch (error) {
    console.error('Error fetching favorites', error);
    return [];
  }
};

export const addFavorite = async (productId: string): Promise<unknown> => {
  try {
    const res = await apiClient.post(API_ENDPOINTS.FAVORITES.BY_ID(productId));
    return res.data;
  } catch (error: unknown) {
    const message = (axios.isAxiosError(error) && error.response?.data?.message) || (error instanceof Error ? error.message : 'Failed to add favorite');
    throw new Error(message);
  }
};

export const removeFavorite = async (productId: string): Promise<unknown> => {
  try {
    const res = await apiClient.delete(API_ENDPOINTS.FAVORITES.BY_ID(productId));
    return res.data;
  } catch (error: unknown) {
    const message = (axios.isAxiosError(error) && error.response?.data?.message) || (error instanceof Error ? error.message : 'Failed to remove favorite');
    throw new Error(message);
  }
};
