import { API_ENDPOINTS } from "./endpoints";
import { apiClient } from './client';

export const getAdminProducts = async (page = 1, limit = 10) => {
  try {
    const res = await apiClient.get(`products/admin?page=${page}&limit=${limit}`);
    const payload = Array.isArray(res.data?.data) ? res.data.data : [];
    const total = typeof res.data?.pagination?.total === 'number' ? res.data.pagination.total : payload.length;
    return { products: payload, total };
  } catch (error) {
    console.error('Error fetching admin products', error);
    return { products: [], total: 0 };
  }
};

export const getOverviewAnalytics = async (categoryId?: string, modelTypeId?: string) => {
  try {
    const params: Record<string, string> = {};
    if (categoryId) params.category_id = categoryId;
    if (modelTypeId) params.model_type_id = modelTypeId;

    const res = await apiClient.get('analytics/overview', { params });
    const data = res.data.data;
    return {
      totalProducts: data.totalProducts,
      totalUsers: data.totalUsers,
      totalFavorites: data.totalFavorites,
      totalCategories: data.totalCategories,
      activeProducts: data.activeProducts,
      totalOrders: data.totalOrders || 0,
      totalStock: data.totalStock || 0,
      itemsSold: data.itemsSold || 0,
    };
  } catch (error) {
    console.error('Error fetching analytics', error);
    return null;
  }
};

export const createProduct = async (productData: any, imageUris: string[] = []) => {
  try {
    const formData = new FormData();
    Object.keys(productData).forEach(key => {
      if (key !== 'categoryName' && productData[key] !== undefined && productData[key] !== null) {
        formData.append(key, String(productData[key]));
      }
    });
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
    const res = await apiClient.post(API_ENDPOINTS.PRODUCTS.BASE, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return {
      success: true,
      id: res.data.data.id,
      unique_code: res.data.data.unique_code,
    };
  } catch (error: any) {
    throw new Error(error?.response?.data?.message || error.message || 'Failed to create product');
  }
};

export const updateProduct = async (id: string, productData: any, imageUris: string[] = []) => {
  try {
    const formData = new FormData();
    Object.keys(productData).forEach(key => {
      if (key !== 'categoryName' && productData[key] !== undefined && productData[key] !== null) {
        formData.append(key, String(productData[key]));
      }
    });
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
          formData.append('existing_images', uri);
        }
      });
    } else {
      formData.append('existing_images', '');
    }
    const res = await apiClient.put(API_ENDPOINTS.PRODUCTS.BY_ID(id), formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return { success: true, id: res.data.data.id };
  } catch (error: any) {
    throw new Error(error?.response?.data?.message || error.message || 'Failed to update product');
  }
};

export const sellProduct = async (id: string, quantity = 1) => {
  try {
    const res = await apiClient.patch(API_ENDPOINTS.PRODUCTS.SELL(id), { quantity });
    return res.data.data;
  } catch (error: any) {
    throw new Error(error?.response?.data?.message || error.message || 'Failed to sell product');
  }
};

export const deleteProduct = async (id: string) => {
  try {
    const res = await apiClient.delete(API_ENDPOINTS.PRODUCTS.BY_ID(id));
    return res.data.success;
  } catch (error: any) {
    throw new Error(error?.response?.data?.message || error.message || 'Failed to delete product');
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
    const res = await apiClient.post(API_ENDPOINTS.CATEGORIES.BASE, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data.data;
  } catch (error: any) {
    throw new Error(error?.response?.data?.message || error.message || 'Failed to create category');
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
    const res = await apiClient.put(`/categories/${categoryId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data.data;
  } catch (error: any) {
    throw new Error(error?.response?.data?.message || error.message || 'Failed to update category');
  }
};

export const deleteCategory = async (categoryId: string) => {
  try {
    const res = await apiClient.delete(`/categories/${categoryId}`);
    return res.data.success;
  } catch (error: any) {
    throw new Error(error?.response?.data?.message || error.message || 'Failed to delete category');
  }
};

export const broadcastNotification = async (notificationData: any) => {
  try {
    const res = await apiClient.post('/notifications', notificationData);
    return res.data;
  } catch (error: any) {
    throw new Error(error?.response?.data?.message || error.message || 'Failed to send notification');
  }
};

export const createModelType = async (modelTypeData: { name: string }) => {
  try {
    const res = await apiClient.post(API_ENDPOINTS.MODEL_TYPES.BASE, modelTypeData);
    return res.data.data;
  } catch (error: any) {
    throw new Error(error?.response?.data?.message || error.message || 'Failed to create model type');
  }
};

export const updateModelType = async (id: string, modelTypeData: { name: string }) => {
  try {
    const res = await apiClient.put(API_ENDPOINTS.MODEL_TYPES.BY_ID(id), modelTypeData);
    return res.data.data;
  } catch (error: any) {
    throw new Error(error?.response?.data?.message || error.message || 'Failed to update model type');
  }
};

export const deleteModelType = async (id: string) => {
  try {
    const res = await apiClient.delete(API_ENDPOINTS.MODEL_TYPES.BY_ID(id));
    return res.data.data;
  } catch (error: any) {
    throw new Error(error?.response?.data?.message || error.message || 'Failed to delete model type');
  }
};
