import { getFirestore, collection, getCountFromServer, query, where, addDoc } from '@react-native-firebase/firestore';
import * as SecureStore from 'expo-secure-store';
import { apiClient } from './client';

export const getOverviewAnalytics = async () => {
  try {
    const res = await apiClient.get('analytics/overview');
    const data = res.data.data;
    return {
      totalProducts: data.totalProducts,
      totalUsers: data.totalUsers,
      totalFavorites: data.totalFavorites,
      totalCategories: data.totalCategories,
      activeProducts: data.activeProducts,
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
      if (response.status === 401) {
        import('../store/authStore').then(({ useAuthStore }) => {
          useAuthStore.getState().logout();
        });
      }
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

export const updateProduct = async (id: string, productData: any, imageUris: string[] = []) => {
  try {
    const formData = new FormData();

    // Append product fields
    Object.keys(productData).forEach(key => {
      if (key !== 'categoryName' && productData[key] !== undefined && productData[key] !== null) {
        formData.append(key, String(productData[key]));
      }
    });

    // Append images (only local URIs need to be uploaded, URLs are already on server, but typically backend expects all or handles diff. We will send all non-http ones as files, and maybe a separate list of retained existing ones if backend supports it. For now, send new ones.)
    if (imageUris && imageUris.length > 0) {
      imageUris.forEach((uri, index) => {
        if (!uri.startsWith('http')) {
          const extension = uri.split('.').pop() || 'jpg';
          formData.append('images', {
            uri,
            type: `image/${extension === 'jpg' ? 'jpeg' : extension}`,
            name: `image_${index}.${extension}`,
          } as any);
        } else {
          // If the backend accepts existing_images array:
          formData.append('existing_images', uri);
        }
      });
    } else {
      // If no images at all, maybe send empty array or backend will handle it
      formData.append('existing_images', '[]'); // Depending on backend
    }

    const token = await SecureStore.getItemAsync('auth_token');
    const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.29.241:5000/api';

    const response = await fetch(`${API_URL}/products/${id}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    const responseData = await response.json();

    if (!response.ok) {
      if (response.status === 401) {
        import('../store/authStore').then(({ useAuthStore }) => {
          useAuthStore.getState().logout();
        });
      }
      throw new Error(responseData.message || 'Failed to update product');
    }

    return {
      success: true,
      id: responseData.data.id,
    };
  } catch (error: any) {
    throw new Error(error.message || 'Failed to update product');
  }
};

export const deleteProduct = async (id: string) => {
  try {
    const token = await SecureStore.getItemAsync('auth_token');
    const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.29.241:5000/api';

    const response = await fetch(`${API_URL}/products/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    const responseData = await response.json();

    if (!response.ok) {
      if (response.status === 401) {
        import('../store/authStore').then(({ useAuthStore }) => {
          useAuthStore.getState().logout();
        });
      }
      throw new Error(responseData.message || 'Failed to delete product');
    }

    return responseData.success;
  } catch (error: any) {
    throw new Error(error.message || 'Failed to delete product');
  }
};

export const createCategoryWithImage = async (
  categoryName: string, 
  imageUri?: string,
  modelTypeId?: string,
  size_type?: string,
  standard_sizes?: string[],
  custom_measurement_fields?: string[]
) => {
  try {
    const formData = new FormData();
    formData.append('category_name', categoryName);

    if (modelTypeId) formData.append('model_type_id', modelTypeId);
    if (size_type) formData.append('size_type', size_type);
    if (standard_sizes && standard_sizes.length > 0) {
      formData.append('standard_sizes', JSON.stringify(standard_sizes));
    }
    if (custom_measurement_fields && custom_measurement_fields.length > 0) {
      formData.append('custom_measurement_fields', JSON.stringify(custom_measurement_fields));
    }

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
      if (response.status === 401) {
        import('../store/authStore').then(({ useAuthStore }) => {
          useAuthStore.getState().logout();
        });
      }
      throw new Error(responseData.message || 'Failed to create category');
    }

    return responseData.data; // Should return the created category object
  } catch (error: any) {
    throw new Error(error.message || 'Failed to create category');
  }
};

export const updateCategoryWithImage = async (
  categoryId: string,
  categoryName: string, 
  imageUri?: string,
  modelTypeId?: string,
  size_type?: string,
  standard_sizes?: string[],
  custom_measurement_fields?: string[]
) => {
  try {
    const formData = new FormData();
    formData.append('category_name', categoryName);

    if (modelTypeId) formData.append('model_type_id', modelTypeId);
    if (size_type) formData.append('size_type', size_type);
    if (standard_sizes && standard_sizes.length > 0) {
      formData.append('standard_sizes', JSON.stringify(standard_sizes));
    }
    if (custom_measurement_fields && custom_measurement_fields.length > 0) {
      formData.append('custom_measurement_fields', JSON.stringify(custom_measurement_fields));
    }

    if (imageUri && !imageUri.startsWith('http')) {
      const extension = imageUri.split('.').pop() || 'jpg';
      formData.append('image', {
        uri: imageUri,
        type: `image/${extension === 'jpg' ? 'jpeg' : extension}`,
        name: `category_image.${extension}`,
      } as any);
    }

    const token = await SecureStore.getItemAsync('auth_token');
    const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.29.241:5000/api';

    const response = await fetch(`${API_URL}/categories/${categoryId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    const responseData = await response.json();

    if (!response.ok) {
      if (response.status === 401) {
        import('../store/authStore').then(({ useAuthStore }) => {
          useAuthStore.getState().logout();
        });
      }
      throw new Error(responseData.message || 'Failed to update category');
    }

    return responseData.data;
  } catch (error: any) {
    throw new Error(error.message || 'Failed to update category');
  }
};

export const deleteCategory = async (categoryId: string) => {
  try {
    const token = await SecureStore.getItemAsync('auth_token');
    const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.29.241:5000/api';

    const response = await fetch(`${API_URL}/categories/${categoryId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    const responseData = await response.json();

    if (!response.ok) {
      if (response.status === 401) {
        import('../store/authStore').then(({ useAuthStore }) => {
          useAuthStore.getState().logout();
        });
      }
      throw new Error(responseData.message || 'Failed to delete category');
    }

    return responseData.success;
  } catch (error: any) {
    throw new Error(error.message || 'Failed to delete category');
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

export const createModelType = async (modelTypeData: {
  name: string;
}) => {
  try {
    const token = await SecureStore.getItemAsync('auth_token');
    const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.29.241:5000/api';

    const response = await fetch(`${API_URL}/model-types`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(modelTypeData),
    });

    const responseData = await response.json();

    if (!response.ok) {
      if (response.status === 401) {
        import('../store/authStore').then(({ useAuthStore }) => {
          useAuthStore.getState().logout();
        });
      }
      throw new Error(responseData.message || 'Failed to create model type');
    }

    return responseData.data;
  } catch (error: any) {
    throw new Error(error.message || 'Failed to create model type');
  }
};

export const updateModelType = async (id: string, modelTypeData: {
  name: string;
}) => {
  try {
    const token = await SecureStore.getItemAsync('auth_token');
    const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.29.241:5000/api';

    const response = await fetch(`${API_URL}/model-types/${id}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(modelTypeData),
    });

    const responseData = await response.json();

    if (!response.ok) {
      if (response.status === 401) {
        import('../store/authStore').then(({ useAuthStore }) => {
          useAuthStore.getState().logout();
        });
      }
      throw new Error(responseData.message || 'Failed to update model type');
    }

    return responseData.data;
  } catch (error: any) {
    throw new Error(error.message || 'Failed to update model type');
  }
};

export const deleteModelType = async (id: string) => {
  try {
    const token = await SecureStore.getItemAsync('auth_token');
    const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.29.241:5000/api';

    const response = await fetch(`${API_URL}/model-types/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    const responseData = await response.json();

    if (!response.ok) {
      if (response.status === 401) {
        import('../store/authStore').then(({ useAuthStore }) => {
          useAuthStore.getState().logout();
        });
      }
      throw new Error(responseData.message || 'Failed to delete model type');
    }

    return responseData.data;
  } catch (error: any) {
    throw new Error(error.message || 'Failed to delete model type');
  }
};
