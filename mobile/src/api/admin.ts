import { isAxiosError } from "axios";
import { API_ENDPOINTS } from "./endpoints";
import { apiClient } from './client';
import { Product } from "./products";

export interface CreateProductPayload {
  product_name?: string;
  category_id?: string;
  model_type_id?: string;
  price?: number | string;
  quantity?: number | string;
  unique_code?: string;
  description?: string;
  is_active?: boolean;
  has_variants?: boolean;
  variants?: unknown;
  accepts_custom_size?: boolean;
  custom_size_price?: number | string;
  status?: string;
  [key: string]: unknown;
}

export interface AdminAnalyticsData {
  totalProducts: number;
  totalUsers: number;
  totalFavorites: number;
  totalCategories: number;
  activeProducts: number;
  totalOrders: number;
  totalStock: number;
}

export const getAdminProducts = async (page = 1, limit = 10): Promise<{ products: Product[]; total: number }> => {
  try {
    const res = await apiClient.get(`products/admin?page=${page}&limit=${limit}`);
    const payload: Product[] = Array.isArray(res.data?.data) ? res.data.data : [];
    const total = typeof res.data?.pagination?.total === 'number' ? res.data.pagination.total : payload.length;
    return { products: payload, total };
  } catch (error) {
    console.error('Error fetching admin products', error);
    return { products: [], total: 0 };
  }
};

export const getOverviewAnalytics = async (categoryId?: string, modelTypeId?: string): Promise<AdminAnalyticsData | null> => {
  try {
    const params: Record<string, string> = {};
    if (categoryId) params.category_id = categoryId;
    if (modelTypeId) params.model_type_id = modelTypeId;

    const res = await apiClient.get('analytics/overview', { params });
    const data = res.data?.data || {};
    return {
      totalProducts: data.totalProducts || 0,
      totalUsers: data.totalUsers || 0,
      totalFavorites: data.totalFavorites || 0,
      totalCategories: data.totalCategories || 0,
      activeProducts: data.activeProducts || 0,
      totalOrders: data.totalOrders || 0,
      totalStock: data.totalStock || 0,
    };
  } catch (error) {
    console.error('Error fetching analytics', error);
    return null;
  }
};

export const createProduct = async (productData: CreateProductPayload, imageUris: string[] = []) => {
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
        } as unknown as Blob);
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
  } catch (error: unknown) {
    const message = (isAxiosError(error) && error.response?.data?.message) || (error instanceof Error ? error.message : 'Failed to create product');
    throw new Error(message);
  }
};

export const updateProduct = async (id: string, productData: Partial<CreateProductPayload>, imageUris: string[] = []) => {
  try {
    const formData = new FormData();
    Object.keys(productData).forEach(key => {
      if (key !== 'categoryName' && productData[key] !== undefined && productData[key] !== null) {
        formData.append(key, String(productData[key]));
      }
    });
    if (imageUris && imageUris.length > 0) {
      imageUris.forEach((rawItem, index) => {
        const uri = typeof rawItem === 'string' ? rawItem.trim() : ((rawItem as any)?.image_url || (rawItem as any)?.uri || '');
        if (!uri) return;

        if (!uri.startsWith('http')) {
          const cleanUri = uri.split('?')[0];
          const extension = cleanUri.split('.').pop()?.toLowerCase() || 'jpg';
          const mimeType = extension === 'png' ? 'image/png' : (extension === 'webp' ? 'image/webp' : 'image/jpeg');
          formData.append('images', {
            uri,
            type: mimeType,
            name: `image_${Date.now()}_${index}.${extension}`,
          } as unknown as Blob);
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
  } catch (error: unknown) {
    const message = (isAxiosError(error) && error.response?.data?.message) || (error instanceof Error ? error.message : 'Failed to update product');
    throw new Error(message);
  }
};

export const sellProduct = async (
  id: string,
  quantity = 1,
  extra?: { customer_name?: string; customer_phone?: string; notes?: string; order_number?: string; orderNumber?: string }
) => {
  try {
    const res = await apiClient.patch(API_ENDPOINTS.PRODUCTS.SELL(id), { quantity, ...extra });
    return res.data.data;
  } catch (error: unknown) {
    const message = (isAxiosError(error) && error.response?.data?.message) || (error instanceof Error ? error.message : 'Failed to sell product');
    throw new Error(message);
  }
};

export const lookupProductByCode = async (code: string) => {
  try {
    const res = await apiClient.get(API_ENDPOINTS.PRODUCTS.LOOKUP_CODE(code));
    const data = res.data.data;
    if (data) {
      let image_url = typeof data.image_url === 'string' ? data.image_url.trim() : '';
      if (!image_url && Array.isArray(data.images) && data.images.length > 0) {
        const primary = data.images.find((img: any) => img && typeof img === 'object' && img.is_primary);
        const first = primary || data.images[0];
        if (typeof first === 'string') image_url = first.trim();
        else if (first && typeof first.image_url === 'string') image_url = first.image_url.trim();
        else if (first && typeof first.url === 'string') image_url = first.url.trim();
      }
      data.image_url = image_url;
    }
    return data;
  } catch (error: unknown) {
    const message = (isAxiosError(error) && error.response?.data?.message) || (error instanceof Error ? error.message : 'Product not found');
    throw new Error(message);
  }
};

export const sellProductByCode = async (
  code: string,
  quantity = 1,
  extra?: { customer_name?: string; customer_phone?: string; notes?: string; order_number?: string; orderNumber?: string }
) => {
  try {
    const res = await apiClient.post(API_ENDPOINTS.PRODUCTS.SELL_BY_CODE, {
      code,
      quantity,
      ...extra,
    });
    return res.data.data;
  } catch (error: unknown) {
    const message = (isAxiosError(error) && error.response?.data?.message) || (error instanceof Error ? error.message : 'Failed to sell product');
    throw new Error(message);
  }
};

export const updateProductStock = async (
  id: string,
  payload: number | { quantity?: number; variant_id?: string; variants?: { id: string; size?: string; quantity: number }[] }
) => {
  try {
    const data = typeof payload === 'number' ? { quantity: payload } : payload;
    const res = await apiClient.patch(API_ENDPOINTS.PRODUCTS.UPDATE_STOCK(id), data);
    return res.data.data;
  } catch (error: unknown) {
    const message = (isAxiosError(error) && error.response?.data?.message) || (error instanceof Error ? error.message : 'Failed to update stock');
    throw new Error(message);
  }
};

export const updateStock = updateProductStock;


export const deleteProduct = async (id: string) => {
  try {
    const res = await apiClient.delete(API_ENDPOINTS.PRODUCTS.BY_ID(id));
    return res.data.success;
  } catch (error: unknown) {
    const message = (isAxiosError(error) && error.response?.data?.message) || (error instanceof Error ? error.message : 'Failed to delete product');
    throw new Error(message);
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
      } as unknown as Blob);
    }
    const res = await apiClient.post(API_ENDPOINTS.CATEGORIES.BASE, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data.data;
  } catch (error: unknown) {
    const message = (isAxiosError(error) && error.response?.data?.message) || (error instanceof Error ? error.message : 'Failed to create category');
    throw new Error(message);
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
      } as unknown as Blob);
    }
    const res = await apiClient.put(`/categories/${categoryId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data.data;
  } catch (error: unknown) {
    const message = (isAxiosError(error) && error.response?.data?.message) || (error instanceof Error ? error.message : 'Failed to update category');
    throw new Error(message);
  }
};

export const deleteCategory = async (categoryId: string) => {
  try {
    const res = await apiClient.delete(`/categories/${categoryId}`);
    return res.data.success;
  } catch (error: unknown) {
    const message = (isAxiosError(error) && error.response?.data?.message) || (error instanceof Error ? error.message : 'Failed to delete category');
    throw new Error(message);
  }
};

export const broadcastNotification = async (notificationData: {
  title: string;
  message: string;
  type?: string;
  link?: string;
  [key: string]: unknown;
}) => {
  try {
    const res = await apiClient.post(API_ENDPOINTS.NOTIFICATIONS.BROADCAST, notificationData);
    return res.data;
  } catch (error: unknown) {
    const message = (isAxiosError(error) && error.response?.data?.message) || (error instanceof Error ? error.message : 'Failed to send notification');
    throw new Error(message);
  }
};

export const createModelType = async (modelTypeData: { name: string }) => {
  try {
    const res = await apiClient.post(API_ENDPOINTS.MODEL_TYPES.BASE, modelTypeData);
    return res.data.data;
  } catch (error: unknown) {
    const message = (isAxiosError(error) && error.response?.data?.message) || (error instanceof Error ? error.message : 'Failed to create model type');
    throw new Error(message);
  }
};

export const updateModelType = async (id: string, modelTypeData: { name: string }) => {
  try {
    const res = await apiClient.put(API_ENDPOINTS.MODEL_TYPES.BY_ID(id), modelTypeData);
    return res.data.data;
  } catch (error: unknown) {
    const message = (isAxiosError(error) && error.response?.data?.message) || (error instanceof Error ? error.message : 'Failed to update model type');
    throw new Error(message);
  }
};

export const deleteModelType = async (id: string) => {
  try {
    const res = await apiClient.delete(API_ENDPOINTS.MODEL_TYPES.BY_ID(id));
    return res.data.data;
  } catch (error: unknown) {
    const message = (isAxiosError(error) && error.response?.data?.message) || (error instanceof Error ? error.message : 'Failed to delete model type');
    throw new Error(message);
  }
};

export const lookupCustomerByPhone = async (phone: string) => {
  try {
    const res = await apiClient.get(API_ENDPOINTS.USERS.LOOKUP(phone));
    return res.data.data as { found: boolean; user: any | null };
  } catch (error: unknown) {
    const message = (isAxiosError(error) && error.response?.data?.message) || (error instanceof Error ? error.message : 'Failed to look up customer');
    throw new Error(message);
  }
};

export const createCustomer = async (data: { full_name: string; phone: string; email?: string; password?: string }) => {
  try {
    const res = await apiClient.post(API_ENDPOINTS.USERS.CUSTOMERS, data);
    return res.data.data;
  } catch (error: unknown) {
    const message = (isAxiosError(error) && error.response?.data?.message) || (error instanceof Error ? error.message : 'Failed to create customer');
    throw new Error(message);
  }
};

export interface AdminNotificationItem {
  id: string;
  type: string;
  title: string;
  body?: string;
  message?: string;
  is_read: boolean;
  created_at: string;
  product_id?: string | null;
  order_id?: string | null;
  order_number?: string | null;
  unique_code?: string | null;
  image_url?: string | null;
  priority?: string;
  category?: string;
}

export const getAdminNotifications = async (): Promise<AdminNotificationItem[]> => {
  try {
    const res = await apiClient.get(API_ENDPOINTS.ADMIN_NOTIFICATIONS.BASE);
    const raw = res.data?.data;
    return Array.isArray(raw) ? raw : [];
  } catch (error) {
    console.warn("Failed to fetch admin notifications:", error);
    return [];
  }
};

export const markAdminNotificationRead = async (id: string): Promise<void> => {
  try {
    await apiClient.patch(API_ENDPOINTS.ADMIN_NOTIFICATIONS.MARK_READ(id));
  } catch (error) {
    console.warn("Failed to mark admin notification read:", error);
  }
};

export const markAllAdminNotificationsRead = async (): Promise<void> => {
  try {
    await apiClient.patch(API_ENDPOINTS.ADMIN_NOTIFICATIONS.MARK_ALL_READ);
  } catch (error) {
    console.warn("Failed to mark all admin notifications read:", error);
  }
};

export const clearAllAdminNotifications = async (): Promise<void> => {
  try {
    await apiClient.delete(API_ENDPOINTS.ADMIN_NOTIFICATIONS.CLEAR_ALL);
  } catch (error) {
    console.warn("Failed to clear all admin notifications:", error);
  }
};

export const deleteAdminNotification = async (id: string): Promise<void> => {
  try {
    await apiClient.delete(API_ENDPOINTS.ADMIN_NOTIFICATIONS.BY_ID(id));
  } catch (error) {
    console.warn("Failed to delete admin notification:", error);
  }
};

