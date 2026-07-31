import { apiClient } from './client';

export interface ModelType {
  id: string;
  name: string;
}

export const getModelTypes = async (): Promise<ModelType[]> => {
  try {
    const res = await apiClient.get('model-types');
    return res.data.data as ModelType[];
  } catch (error) {
    console.error('Error fetching model types', error);
    return [];
  }
};
