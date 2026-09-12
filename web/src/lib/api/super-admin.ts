import { API_ENDPOINTS } from "./endpoints";
import { apiClient, extractData, API_URL } from "./client";
import { SuperAdminDashboardData, RevenueLedgerItem, ProductAnalyticsDetail, AdminStaff, AdminOrder, UserProfile } from "./types";

export const superAdminApi = {
  getDashboard: (params?: { period?: string; fromDate?: string; toDate?: string; categoryId?: string; modelTypeId?: string; adminId?: string }) =>
    apiClient.get(API_ENDPOINTS.SUPER_ADMIN.DASHBOARD, { params }).then((r) => extractData<SuperAdminDashboardData>(r)),

  getSalesList: (params?: { page?: number; limit?: number; status?: string; search?: string }) =>
    apiClient.get(API_ENDPOINTS.SUPER_ADMIN.SALES, { params }).then((r) => ({
      sales: extractData<any[]>(r),
      total: r.data?.pagination?.total || 0,
    })),

  getSaleDetail: (id: string) =>
    apiClient.get(API_ENDPOINTS.SUPER_ADMIN.SALE_BY_ID(id)).then((r) => extractData<any>(r)),

  getProductsAnalytics: (params?: { page?: number; limit?: number }) =>
    apiClient.get(API_ENDPOINTS.SUPER_ADMIN.PRODUCTS_ANALYTICS, { params }).then((r) => ({
      products: extractData<any[]>(r),
      total: r.data?.pagination?.total || 0,
    })),

  getProductAnalyticsDetail: (id: string) =>
    apiClient.get(API_ENDPOINTS.SUPER_ADMIN.PRODUCT_ANALYTICS_BY_ID(id)).then((r) => extractData<ProductAnalyticsDetail>(r)),

  getRevenueLedger: (params?: { page?: number; limit?: number; fromDate?: string; toDate?: string; transactionType?: string; adminId?: string }) =>
    apiClient.get(API_ENDPOINTS.SUPER_ADMIN.REVENUE, { params }).then((r) => ({
      items: extractData<RevenueLedgerItem[]>(r),
      total: r.data?.pagination?.total || 0,
    })),

  getAdminActivity: (params?: { page?: number; limit?: number; actorId?: string; action?: string }) =>
    apiClient.get(API_ENDPOINTS.SUPER_ADMIN.ACTIVITY, { params }).then((r) => ({
      items: extractData<any[]>(r),
      total: r.data?.pagination?.total || 0,
    })),

  getNotifications: () =>
    apiClient.get(API_ENDPOINTS.SUPER_ADMIN.NOTIFICATIONS).then((r) => extractData<any[]>(r)),

  markNotificationRead: (id: string) =>
    apiClient.patch(API_ENDPOINTS.SUPER_ADMIN.MARK_NOTIFICATION_READ(id)).then((r) => r.data),

  getCommissionSettings: () =>
    apiClient.get(API_ENDPOINTS.SUPER_ADMIN.COMMISSION).then((r) => extractData<any>(r)),

  updateCommissionSettings: (data: { admin_percentage: number; super_admin_percentage: number }) =>
    apiClient.put(API_ENDPOINTS.SUPER_ADMIN.COMMISSION, data).then((r) => extractData<any>(r)),

  completeOrder: (id: string) =>
    apiClient.post(API_ENDPOINTS.ORDERS.COMPLETE(id)).then((r) => r.data),

  refundOrder: (id: string, reason?: string) =>
    apiClient.post(API_ENDPOINTS.ORDERS.REFUND(id), { reason }).then((r) => r.data),

  // Staff & Admin Management
  getAdmins: () =>
    apiClient.get(API_ENDPOINTS.SUPER_ADMIN.ADMINS).then((r) => extractData<AdminStaff[]>(r)),

  createAdmin: (data: { full_name: string; email: string; password: string; phone?: string }) =>
    apiClient.post(API_ENDPOINTS.SUPER_ADMIN.ADMINS, data).then((r) => r.data),

  updateAdminStatus: (id: string, isActive: boolean) =>
    apiClient.patch(API_ENDPOINTS.SUPER_ADMIN.ADMIN_STATUS(id), { isActive }).then((r) => r.data),

  deleteAdmin: (id: string) =>
    apiClient.delete(API_ENDPOINTS.SUPER_ADMIN.ADMIN_BY_ID(id)).then((r) => r.data),

  // Full Order Management
  getOrders: (params?: { page?: number; limit?: number; status?: string; search?: string }) =>
    apiClient.get(API_ENDPOINTS.ORDERS.ADMIN_ALL, { params }).then((r) => ({
      orders: (r.data?.data || []) as AdminOrder[],
      total: r.data?.pagination?.total || 0,
      totalPages: r.data?.pagination?.totalPages || 1,
    })),

  createOrder: (data: {
    items: Array<{ productId: string; variantId?: string | null; quantity: number }>;
    shippingAddressSnapshot?: any;
  }) => apiClient.post(API_ENDPOINTS.ORDERS.BASE, data).then((r) => r.data),

  updateOrderStatus: (id: string, status: string, notes?: string) =>
    apiClient.patch(API_ENDPOINTS.ORDERS.STATUS(id), { status, notes }).then((r) => r.data),

  // Customer Management
  getCustomers: (params?: { page?: number; limit?: number; search?: string }) =>
    apiClient.get(API_ENDPOINTS.USERS.BASE, { params: { ...params, role: "user" } }).then((r) => ({
      customers: extractData<UserProfile[]>(r),
      total: r.data?.pagination?.total || 0,
    })),

  exportSalesCsvUrl: `${API_URL}${API_ENDPOINTS.SUPER_ADMIN.EXPORT_SALES}`,
  exportRevenueCsvUrl: `${API_URL}${API_ENDPOINTS.SUPER_ADMIN.EXPORT_REVENUE}`,
  exportProductsCsvUrl: `${API_URL}${API_ENDPOINTS.SUPER_ADMIN.EXPORT_PRODUCTS}`,
};
