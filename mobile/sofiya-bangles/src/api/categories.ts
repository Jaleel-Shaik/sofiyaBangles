import { getFirestore, collection, getDocs, doc, setDoc, orderBy, query } from '@react-native-firebase/firestore';

export interface Category {
  id: string;
  category_name: string;
  image_url: string;
  display_order: number;
  is_active: boolean;
}

const DEFAULT_CATEGORIES = [
  { id: 'cat-1', category_name: 'Bridal Bangles', image_url: 'https://images.unsplash.com/photo-1599643478524-fb66f453863a', display_order: 1, is_active: true },
  { id: 'cat-2', category_name: 'Daily Wear', image_url: 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a', display_order: 2, is_active: true },
  { id: 'cat-3', category_name: 'Glass Bangles', image_url: 'https://images.unsplash.com/photo-1602751584552-8ba73aad10e1', display_order: 3, is_active: true },
  { id: 'cat-4', category_name: 'Gold Plated', image_url: 'https://images.unsplash.com/photo-1606760227091-3dd870d97f1d', display_order: 4, is_active: true }
];

export const getCategories = async () => {
  try {
    const db = getFirestore();
    const categoriesRef = collection(db, 'categories');
    const q = query(categoriesRef, orderBy('display_order', 'asc'));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      console.log('Categories collection is empty. Seeding defaults...');
      // Seed default categories
      for (const cat of DEFAULT_CATEGORIES) {
        await setDoc(doc(db, 'categories', cat.id), cat);
      }
      return DEFAULT_CATEGORIES;
    }

    return snapshot.docs.map(document => ({ id: document.id, ...document.data() } as Category));
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
