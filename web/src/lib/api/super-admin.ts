import { apiClient, extractData, API_URL } from "./client";
import { SuperAdminDashboardData, RevenueLedgerItem, ProductAnalyticsDetail, AdminStaff, AdminOrder, UserProfile } from "./types";

export const superAdminApi = {
  getDashboard: (params?: { period?: string; fromDate?: string; toDate?: string; categoryId?: string; modelTypeId?: string; adminId?: string }) =>
    apiClient.get("/super-admin/dashboard", { params }).then((r) => extractData<SuperAdminDashboardData>(r)),

  getSalesList: (params?: { page?: number; limit?: number; status?: string; search?: string }) =>
    apiClient.get("/super-admin/sales", { params }).then((r) => ({
      sales: extractData<any[]>(r),
      total: r.data?.pagination?.total || 0,
    })),

  getSaleDetail: (id: string) =>
    apiClient.get(`/super-admin/sales/${id}`).then((r) => extractData<any>(r)),

  getProductsAnalytics: (params?: { page?: number; limit?: number }) =>
    apiClient.get("/super-admin/products-analytics", { params }).then((r) => ({
      products: extractData<any[]>(r),
      total: r.data?.pagination?.total || 0,
    })),

  getProductAnalyticsDetail: (id: string) =>
    apiClient.get(`/super-admin/products-analytics/${id}`).then((r) => extractData<ProductAnalyticsDetail>(r)),

  getRevenueLedger: (params?: { page?: number; limit?: number; fromDate?: string; toDate?: string; transactionType?: string; adminId?: string }) =>
    apiClient.get("/super-admin/revenue", { params }).then((r) => ({
      items: extractData<RevenueLedgerItem[]>(r),
      total: r.data?.pagination?.total || 0,
    })),

  getAdminActivity: (params?: { page?: number; limit?: number; actorId?: string; action?: string }) =>
    apiClient.get("/super-admin/activity", { params }).then((r) => ({
      items: extractData<any[]>(r),
      total: r.data?.pagination?.total || 0,
    })),

  getNotifications: () =>
    apiClient.get("/super-admin/notifications").then((r) => extractData<any[]>(r)),

  markNotificationRead: (id: string) =>
    apiClient.patch(`/super-admin/notifications/${id}/read`).then((r) => r.data),

  getCommissionSettings: () =>
    apiClient.get("/super-admin/settings/commission").then((r) => extractData<any>(r)),

  updateCommissionSettings: (data: { admin_percentage: number; super_admin_percentage: number }) =>
    apiClient.put("/super-admin/settings/commission", data).then((r) => extractData<any>(r)),

  completeOrder: (id: string) =>
    apiClient.post(`/orders/${id}/complete`).then((r) => r.data),

  refundOrder: (id: string, reason?: string) =>
    apiClient.post(`/orders/${id}/refund`, { reason }).then((r) => r.data),

  // Staff & Admin Management
  getAdmins: () =>
    apiClient.get("/super-admin/admins").then((r) => extractData<AdminStaff[]>(r)),

  createAdmin: (data: { full_name: string; email: string; password: string; phone?: string }) =>
    apiClient.post("/super-admin/admins", data).then((r) => r.data),

  updateAdminStatus: (id: string, isActive: boolean) =>
    apiClient.patch(`/super-admin/admins/${id}/status`, { isActive }).then((r) => r.data),

  deleteAdmin: (id: string) =>
    apiClient.delete(`/super-admin/admins/${id}`).then((r) => r.data),

  // Full Order Management
  getOrders: (params?: { page?: number; limit?: number; status?: string; search?: string }) =>
    apiClient.get("/orders/admin/all", { params }).then((r) => ({
      orders: (r.data?.data || []) as AdminOrder[],
      total: r.data?.pagination?.total || 0,
      totalPages: r.data?.pagination?.totalPages || 1,
    })),

  createOrder: (data: {
    items: Array<{ productId: string; variantId?: string | null; quantity: number }>;
    shippingAddressSnapshot?: any;
  }) => apiClient.post("/orders", data).then((r) => r.data),

  updateOrderStatus: (id: string, status: string, notes?: string) =>
    apiClient.patch(`/orders/${id}/status`, { status, notes }).then((r) => r.data),

  // Customer Management
  getCustomers: (params?: { page?: number; limit?: number; search?: string }) =>
    apiClient.get("/users", { params: { ...params, role: "user" } }).then((r) => ({
      customers: extractData<UserProfile[]>(r),
      total: r.data?.pagination?.total || 0,
    })),

  exportSalesCsvUrl: `${API_URL}/super-admin/export/sales`,
  exportRevenueCsvUrl: `${API_URL}/super-admin/export/revenue`,
  exportProductsCsvUrl: `${API_URL}/super-admin/export/products`,
};
