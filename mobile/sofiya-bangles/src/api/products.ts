import { getFirestore, collection, query, where, orderBy, getDocs, getDoc, doc, setDoc } from '@react-native-firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFavorites } from './favorites';

export interface Product {
  id: string;
  unique_code: string;
  product_name: string;
  description: string;
  price: number;
  image_url: string;
  images?: string[];
  category_id: string;
  quantity: number;
  likes?: number;
  rating?: number;
  reviews?: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

const DEFAULT_PRODUCTS: Product[] = [
  { id: 'prod-1', unique_code: 'GBS-001', product_name: 'Golden Bridal Set', description: 'Beautiful handcrafted golden bridal bangles set perfect for weddings.', price: 149.99, image_url: 'https://images.unsplash.com/photo-1599643478524-fb66f453863a', category_id: 'cat-1', quantity: 15, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'prod-2', unique_code: 'SPDW-002', product_name: 'Silver Plated Daily Wear', description: 'Simple, elegant silver plated bangles for everyday use.', price: 29.99, image_url: 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a', category_id: 'cat-2', quantity: 50, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'prod-3', unique_code: 'MCGB-003', product_name: 'Multi-color Glass Bangles', description: 'Vibrant, traditional glass bangles available in multiple colors.', price: 15.50, image_url: 'https://images.unsplash.com/photo-1602751584552-8ba73aad10e1', category_id: 'cat-3', quantity: 100, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'prod-4', unique_code: 'RGPB-004', product_name: 'Rose Gold Plated Bracelet', description: 'Modern rose gold plated bangle bracelet with subtle stone work.', price: 89.99, image_url: 'https://images.unsplash.com/photo-1606760227091-3dd870d97f1d', category_id: 'cat-4', quantity: 25, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'prod-5', unique_code: 'AKB-005', product_name: 'Antique Kundan Bangles', description: 'Traditional kundan work bangles with a royal antique finish.', price: 199.99, image_url: 'https://images.unsplash.com/photo-1599643478524-fb66f453863a', category_id: 'cat-1', quantity: 5, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
];

export const getProducts = async (page = 1, limit = 10, categoryId?: string, search?: string) => {
  try {
    const db = getFirestore();
    const productsRef = collection(db, 'products');
    let q = query(productsRef, where('is_active', '==', true));
    
    if (categoryId) {
      q = query(q, where('category_id', '==', categoryId));
    }
    
    // We removed orderBy('created_at', 'desc') here to avoid requiring a composite index in Firestore.
    // Instead, we will sort the array locally in JavaScript.
    
    const snapshot = await getDocs(q);
    
    if (snapshot.empty && !categoryId && !search) {
      console.log('Products collection is empty. Seeding defaults...');
      // Seed default products
      for (const prod of DEFAULT_PRODUCTS) {
        await setDoc(doc(db, 'products', prod.id), prod);
      }
      return { products: DEFAULT_PRODUCTS, total: DEFAULT_PRODUCTS.length };
    }
    
    let allProducts = snapshot.docs.map(document => ({ id: document.id, ...document.data() } as Product));

    // Sort locally by created_at descending
    allProducts.sort((a, b) => {
      const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return dateB - dateA;
    });

    if (search) {
      const lowerSearch = search.toLowerCase();
      allProducts = allProducts.filter(p => 
        (p.product_name && p.product_name.toLowerCase().includes(lowerSearch)) ||
        (p.description && p.description.toLowerCase().includes(lowerSearch))
      );
    }

    const total = allProducts.length;
    const offset = (page - 1) * limit;
    const paginatedProducts = allProducts.slice(offset, offset + limit);

    return { products: paginatedProducts, total };
  } catch (error) {
    console.error('Error fetching products', error);
    return { products: [], total: 0 };
  }
};

export const getProductById = async (id: string) => {
  try {
    const db = getFirestore();
    const docRef = doc(db, 'products', id);
    const document = await getDoc(docRef);
    if (document.data() != null) {
      return { id: document.id, ...document.data() } as Product;
    }
    return null;
  } catch (error) {
    console.error(`Error fetching product ${id}`, error);
    return null;
  }
};

export const getRecommendedProducts = async (page = 1, limit = 10, search?: string) => {
  try {
    const [favs, historyStr] = await Promise.all([
      getFavorites(),
      AsyncStorage.getItem('@visited_products')
    ]);
    
    const history = historyStr ? JSON.parse(historyStr) : [];
    
    // Extract unique category IDs and product IDs from favorites and history
    const preferredCategoryIds = new Set<string>();
    const seenProductIds = new Set<string>();
    
    favs.forEach((f: any) => {
      seenProductIds.add(f.product_id);
      if (f.product && f.product.category_id) {
        preferredCategoryIds.add(f.product.category_id);
      }
    });
    history.forEach((h: any) => {
      seenProductIds.add(h.id);
      if (h.category_id) preferredCategoryIds.add(h.category_id);
    });

    const db = getFirestore();
    const productsRef = collection(db, 'products');
    const q = query(productsRef, where('is_active', '==', true));
    const snapshot = await getDocs(q);
    
    let allProducts = snapshot.docs.map(document => ({ id: document.id, ...document.data() } as Product));

    // Sort by created_at descending (Newest first)
    allProducts.sort((a, b) => {
      const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return dateB - dateA;
    });

    if (search) {
      const lowerSearch = search.toLowerCase();
      allProducts = allProducts.filter(p => 
        (p.product_name && p.product_name.toLowerCase().includes(lowerSearch)) ||
        (p.description && p.description.toLowerCase().includes(lowerSearch))
      );
    }

    // Filter by preferred categories if any exist
    if (preferredCategoryIds.size > 0 && !search) {
      // Find products in similar categories but EXCLUDE ones they have already seen/liked
      const recommended = allProducts.filter(p => 
        preferredCategoryIds.has(p.category_id) && !seenProductIds.has(p.id)
      );
      
      // If we have NEW recommended products, put them at the top, followed by the rest of the catalog
      if (recommended.length > 0) {
        const otherProducts = allProducts.filter(p => !recommended.some(r => r.id === p.id));
        allProducts = [...recommended, ...otherProducts];
      }
    }

    const total = allProducts.length;
    const offset = (page - 1) * limit;
    const paginatedProducts = allProducts.slice(offset, offset + limit);

    return { products: paginatedProducts, total };
  } catch (error) {
    console.error('Error fetching recommended products', error);
    return { products: [], total: 0 };
  }
};

export const getNewArrivals = async (daysAgo: number, page = 1, limit = 20) => {
  try {
    const db = getFirestore();
    const productsRef = collection(db, 'products');
    const q = query(productsRef, where('is_active', '==', true));
    const snapshot = await getDocs(q);
    
    let allProducts = snapshot.docs.map(document => ({ id: document.id, ...document.data() } as Product));

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysAgo);
    const cutoffTime = cutoffDate.getTime();

    // Filter by date
    allProducts = allProducts.filter(p => {
      if (!p.created_at) return false;
      return new Date(p.created_at).getTime() >= cutoffTime;
    });

    // Sort by created_at descending
    allProducts.sort((a, b) => {
      const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return dateB - dateA;
    });

    const total = allProducts.length;
    const offset = (page - 1) * limit;
    const paginatedProducts = allProducts.slice(offset, offset + limit);

    return { products: paginatedProducts, total };
  } catch (error) {
    console.error('Error fetching new arrivals', error);
    return { products: [], total: 0 };
  }
};
