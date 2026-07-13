import { getFirestore, collection, getDocs, doc, setDoc, orderBy, query } from '@react-native-firebase/firestore';

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

const DEFAULT_CATEGORIES = [
  { id: 'cat-1', category_name: 'Bridal Bangles', image_url: 'https://images.unsplash.com/photo-1599643478524-fb66f453863a', display_order: 1, is_active: true, model_type_id: 'mt-1' },
  { id: 'cat-2', category_name: 'Daily Wear', image_url: 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a', display_order: 2, is_active: true, model_type_id: 'mt-1' },
  { id: 'cat-3', category_name: 'Glass Bangles', image_url: 'https://images.unsplash.com/photo-1602751584552-8ba73aad10e1', display_order: 3, is_active: true, model_type_id: 'mt-1' },
  { id: 'cat-4', category_name: 'Gold Plated', image_url: 'https://images.unsplash.com/photo-1606760227091-3dd870d97f1d', display_order: 4, is_active: true, model_type_id: 'mt-1' }
];

import { apiClient } from './client';

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
    const db = getFirestore();
    const id = `cat-${Date.now()}`;
    const newCategory: Category = {
      id,
      category_name: categoryName,
      // Generic Unsplash image for default categories
      image_url: 'https://images.unsplash.com/photo-1599643478524-fb66f453863a',
      display_order: 99, // Put new categories at the end
      is_active: true
    };
    await setDoc(doc(db, 'categories', id), newCategory);
    return newCategory;
  } catch (error) {
    console.error('Error creating category', error);
    throw error;
  }
};
