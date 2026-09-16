import { apiClient } from './client';

export interface ModelType {
  id: string;
  name: string;
}

export const getModelTypes = async (): Promise<ModelType[]> => {
  try {
    const res = await apiClient.get('model-types');
    const rawData = res.data?.data ?? (Array.isArray(res.data) ? res.data : []);
    const list: ModelType[] = Array.isArray(rawData) ? rawData : [];
    return list
      .filter((m): m is ModelType => Boolean(m && typeof m === 'object'))
      .map(m => ({
        ...m,
        id: String(m.id || ''),
        name: m.name || '',
      }));
  } catch (error) {
    console.error('Error fetching model types', error);
    return [];
  }
};
