import { apiClient } from './client';

export interface UserSizePreference {
  id: string;
  user_id: string;
  category_id: string;
  profile_name: string;
  is_custom: boolean;
  standard_size?: string;
  custom_measurements?: Record<string, string | number>;
  created_at: string;
  updated_at: string;
}

export const getSizePreferences = async (userId: string): Promise<UserSizePreference[]> => {
  try {
    const res = await apiClient.get('size-preferences');
    return res.data.data;
  } catch (error) {
    console.error('Error fetching size preferences', error);
    return [];
  }
};

export const createSizePreference = async (
  userId: string,
  data: Omit<UserSizePreference, 'id' | 'user_id' | 'created_at' | 'updated_at'>
): Promise<UserSizePreference> => {
  try {
    const res = await apiClient.post('size-preferences', data);
    return res.data.data;
  } catch (error) {
    console.error('Error creating size preference', error);
    throw error;
  }
};

export const updateSizePreference = async (
  id: string,
  data: Partial<Omit<UserSizePreference, 'id' | 'user_id' | 'category_id' | 'created_at'>>
): Promise<void> => {
  try {
    await apiClient.put(`size-preferences/${id}`, data);
  } catch (error) {
    console.error('Error updating size preference', error);
    throw error;
  }
};

export const deleteSizePreference = async (id: string): Promise<void> => {
  try {
    await apiClient.delete(`size-preferences/${id}`);
  } catch (error) {
    console.error('Error deleting size preference', error);
    throw error;
  }
};
