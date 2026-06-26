import { getFirestore, collection, getCountFromServer, query, where, addDoc } from '@react-native-firebase/firestore';
import * as SecureStore from 'expo-secure-store';
import { apiClient } from './client';

export const getOverviewAnalytics = async () => {
  try {
    const db = getFirestore();
    const productsSnapshot = await getCountFromServer(collection(db, 'products'));
    const usersSnapshot = await getCountFromServer(query(collection(db, 'profiles'), where('role', '==', 'user')));
    const favoritesSnapshot = await getCountFromServer(collection(db, 'favorites'));
    const categoriesSnapshot = await getCountFromServer(collection(db, 'categories'));

    return {
      totalProducts: productsSnapshot.data().count,
      totalUsers: usersSnapshot.data().count,
      totalFavorites: favoritesSnapshot.data().count,
      totalCategories: categoriesSnapshot.data().count,
    };
  } catch (error) {
    console.error('Error fetching analytics', error);
    return null;
  }
};

export const createProduct = async (productData: any, imageUris: string[] = []) => {
  try {
    const formData = new FormData();

    // Append product fields
    Object.keys(productData).forEach(key => {
      if (key !== 'categoryName' && productData[key] !== undefined && productData[key] !== null) {
        formData.append(key, String(productData[key]));
      }
    });

    // Append images
    if (imageUris && imageUris.length > 0) {
      imageUris.forEach((uri, index) => {
        const extension = uri.split('.').pop() || 'jpg';
        formData.append('images', {
          uri,
          type: `image/${extension === 'jpg' ? 'jpeg' : extension}`,
          name: `image_${index}.${extension}`,
        } as any);
      });
    }

    const token = await SecureStore.getItemAsync('auth_token');
    const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.29.241:5000/api';

    const response = await fetch(`${API_URL}/products`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    const responseData = await response.json();

    if (!response.ok) {
      throw new Error(responseData.message || 'Failed to create product');
    }

    return {
      success: true,
      id: responseData.data.id,
      unique_code: responseData.data.unique_code,
    };
  } catch (error: any) {
    throw new Error(error.message || 'Failed to create product');
  }
};

export const createCategoryWithImage = async (categoryName: string, imageUri?: string) => {
  try {
    const formData = new FormData();
    formData.append('category_name', categoryName);

    if (imageUri) {
      const extension = imageUri.split('.').pop() || 'jpg';
      formData.append('image', {
        uri: imageUri,
        type: `image/${extension === 'jpg' ? 'jpeg' : extension}`,
        name: `category_image.${extension}`,
      } as any);
    }

    const token = await SecureStore.getItemAsync('auth_token');
    const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.29.241:5000/api';

    const response = await fetch(`${API_URL}/categories`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    const responseData = await response.json();

    if (!response.ok) {
      throw new Error(responseData.message || 'Failed to create category');
    }

    return responseData.data; // Should return the created category object
  } catch (error: any) {
    throw new Error(error.message || 'Failed to create category');
  }
};

// ... other admin methods can be ported similarly, left out for brevity if unused currently
export const broadcastNotification = async (notificationData: any) => {
  // Add to global notifications collection
  const db = getFirestore();
  const notifRef = collection(db, 'notifications');
  await addDoc(notifRef, {
    ...notificationData,
    created_at: new Date().toISOString()
  });
  return { success: true };
};
