import { API_ENDPOINTS } from "./endpoints";
import { apiClient, extractData } from "./client";
import { Product, Category, ModelType, BusinessProfile, AnalyticsOverview, UserProfile, User, ProductVariant, AdminReview } from "./types";
export interface CreateProductData {
  product_name: string;
  category_id: string;
  model_type_id: string;
  price: number | string;
  quantity: number | string;
  unique_code?: string;
  description?: string;
  is_active?: boolean;
  has_variants?: boolean;
  variants?: string | ProductVariant[];
  accepts_custom_size?: boolean;
  custom_size_price?: number | string;
  status?: string;
  [key: string]: unknown;
}

export type UpdateProductData = Partial<CreateProductData>;

export const adminApi = {
  // Products
  getProducts: (page = 1, limit = 10, categoryId?: string, search?: string) => {
    let url = `${API_ENDPOINTS.PRODUCTS.BASE}?page=${page}&limit=${limit}`;
    if (categoryId) url += `&category_id=${categoryId}`;
    if (search) url += `&search=${search}`;
    return apiClient.get(url).then((r) => ({
      products: extractData<Product[]>(r),
      total: r.data?.pagination?.total || 0,
    }));
  },
  getAdminProducts: (page = 1, limit = 10) =>
    apiClient.get(`${API_ENDPOINTS.PRODUCTS.ADMIN}?page=${page}&limit=${limit}`).then((r) => ({
      products: extractData<Product[]>(r),
      total: r.data?.pagination?.total || 0,
    })),
  getProductById: (id: string) =>
    apiClient.get(API_ENDPOINTS.PRODUCTS.BY_ID(id)).then((r) => extractData<Product>(r)),
  createProduct: async (productData: CreateProductData, imageUris: string[] = []) => {
    const formData = new FormData();
    Object.keys(productData).forEach(key => {
      const val = productData[key];
      if (val !== undefined && val !== null) {
        formData.append(key, String(val));
      }
    });
    imageUris.forEach((uri) => {
      if (!uri.startsWith('http')) {
        formData.append('images', uri);
      }
    });
    return apiClient.post(API_ENDPOINTS.PRODUCTS.BASE, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data.data);
  },
  createProductDirect: (formData: FormData) =>
    apiClient.post(API_ENDPOINTS.PRODUCTS.BASE, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data.data),
  updateProductDirect: (id: string, formData: FormData) =>
    apiClient.put(API_ENDPOINTS.PRODUCTS.BY_ID(id), formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data.data),
  updateProduct: async (id: string, productData: UpdateProductData, imageUris: string[] = []) => {
    const formData = new FormData();
    Object.keys(productData).forEach(key => {
      const val = productData[key];
      if (val !== undefined && val !== null) {
        formData.append(key, String(val));
      }
    });
    imageUris.forEach(uri => {
      if (!uri.startsWith('http')) formData.append('images', uri);
      else formData.append('existing_images', uri);
    });
    return apiClient.put(API_ENDPOINTS.PRODUCTS.BY_ID(id), formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data.data);
  },
  deleteProduct: (id: string) =>
    apiClient.delete(API_ENDPOINTS.PRODUCTS.BY_ID(id)).then(r => r.data),
  sellProduct: (id: string, quantity = 1, extra?: { customer_name?: string; customer_phone?: string; notes?: string; order_number?: string; orderNumber?: string }) =>
    apiClient.patch(API_ENDPOINTS.PRODUCTS.SELL(id), { quantity, ...extra }).then(r => r.data.data as Product),
  lookupProductByCode: (code: string) =>
    apiClient.get(API_ENDPOINTS.PRODUCTS.LOOKUP_CODE(code)).then(r => r.data.data as Product),
  sellProductByCode: (code: string, quantity = 1, extra?: { customer_name?: string; customer_phone?: string; notes?: string; order_number?: string; orderNumber?: string }) =>
    apiClient.post(API_ENDPOINTS.PRODUCTS.SELL_BY_CODE, { code, quantity, ...extra }).then(r => r.data.data as Product),
  updateStock: (
    id: string,
    payload: number | { quantity?: number; variant_id?: string; variants?: Array<{ id: string; size?: string; quantity: number }> }
  ) => {
    const data = typeof payload === "number" ? { quantity: payload } : payload;
    return apiClient.patch(API_ENDPOINTS.PRODUCTS.UPDATE_STOCK(id), data).then(r => r.data.data as Product);
  },


  // Customer Lookup & Creation (for verified Quick Sell)
  lookupCustomerByPhone: (phone: string) =>
    apiClient
      .get(API_ENDPOINTS.USERS.LOOKUP, { params: { phone } })
      .then((r) => r.data.data as { found: boolean; user: User | null }),
  createCustomer: (data: { full_name: string; phone: string; email: string; password?: string }) =>
    apiClient
      .post(API_ENDPOINTS.USERS.CUSTOMERS, data)
      .then((r) => r.data.data as User),

  // Categories
  getCategories: async (modelTypeId?: string) => {
    const res = await apiClient.get(API_ENDPOINTS.CATEGORIES.BASE, { params: { model_type_id: modelTypeId } });
    return res.data.data as Category[];
  },
  createCategory: async (data: { category_name: string; model_type_id: string; image?: string; standard_sizes?: string[] }) => {
    const formData = new FormData();
    formData.append('category_name', data.category_name);
    formData.append('model_type_id', data.model_type_id);
    if (data.image) {
      const blob = await fetch(data.image).then(r => r.blob());
      formData.append('image', blob, 'category.jpg');
    }
    if (data.standard_sizes) {
       formData.append('size_type', 'standard');
       formData.append('standard_sizes', JSON.stringify(data.standard_sizes));
    } else {
       formData.append('size_type', 'none');
    }
    return apiClient.post(API_ENDPOINTS.CATEGORIES.BASE, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }).then(r => r.data.data);
  },
  updateCategory: async (id: string, data: { category_name?: string; model_type_id?: string; image?: string; standard_sizes?: string[] }) => {
    const formData = new FormData();
    if (data.category_name) formData.append('category_name', data.category_name);
    if (data.model_type_id) formData.append('model_type_id', data.model_type_id);
    if (data.image) {
      const blob = await fetch(data.image).then(r => r.blob());
      formData.append('image', blob, 'category.jpg');
    }
    if (data.standard_sizes) {
       formData.append('size_type', 'standard');
       formData.append('standard_sizes', JSON.stringify(data.standard_sizes));
    } else if (data.standard_sizes !== undefined) {
       formData.append('size_type', 'none');
    }
    return apiClient.put(API_ENDPOINTS.CATEGORIES.BY_ID(id), formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data.data);
  },
  deleteCategory: (id: string) =>
    apiClient.delete(API_ENDPOINTS.CATEGORIES.BY_ID(id)).then(r => r.data),

  // Model Types
  getModelTypes: () =>
    apiClient.get(API_ENDPOINTS.MODEL_TYPES.BASE).then(r => extractData<ModelType[]>(r)),
  createModelType: (data: { name: string }) =>
    apiClient.post(API_ENDPOINTS.MODEL_TYPES.BASE, data).then(r => r.data.data),
  updateModelType: (id: string, data: { name: string }) =>
    apiClient.put(API_ENDPOINTS.MODEL_TYPES.BY_ID(id), data).then(r => r.data.data),
  deleteModelType: (id: string) =>
    apiClient.delete(API_ENDPOINTS.MODEL_TYPES.BY_ID(id)).then(r => r.data),

  // Settings / Business Profile
  getBusinessProfile: () =>
    apiClient.get(API_ENDPOINTS.SETTINGS.BUSINESS_PROFILE).then(r => extractData<BusinessProfile>(r)),
  updateBusinessProfile: (data: Partial<BusinessProfile>) =>
    apiClient.put(API_ENDPOINTS.SETTINGS.BUSINESS_PROFILE, data).then(r => r.data.data),
  uploadBusinessLogo: (file: File) => {
    const formData = new FormData();
    formData.append("logo", file);
    return apiClient
      .post<{ success: boolean; data: BusinessProfile; message: string }>(API_ENDPOINTS.SETTINGS.LOGO, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((r) => r.data.data);
  },

  getOverviewAnalytics: (categoryId?: string, modelTypeId?: string) =>
    apiClient.get(API_ENDPOINTS.ANALYTICS.OVERVIEW, { params: { category_id: categoryId, model_type_id: modelTypeId } }).then(r => extractData<AnalyticsOverview>(r)),

  // Users
  getUsers: () =>
    apiClient.get(API_ENDPOINTS.USERS.BASE).then(r => extractData<UserProfile[]>(r)),
  getUserById: (id: string) =>
    apiClient.get(API_ENDPOINTS.USERS.BY_ID(id)).then(r => extractData<UserProfile>(r)),

  // WhatsApp Admin Action Verification
  verifyAdminLink: (token: string) =>
    apiClient
      .post<{
        success: boolean;
        data: {
          valid: boolean;
          orderNumber: string;
          productId?: string | null;
          adminPhoneMasked: string;
          targetUrl: string;
          mobileAppUrl?: string;
        };
      }>("/orders/verify-admin-link", { token })
      .then((r) => r.data.data),

  // Customer Reviews & Ratings
  getAllReviews: () =>
    apiClient.get("/orders/admin/reviews").then((r) => extractData<AdminReview[]>(r)),
};
