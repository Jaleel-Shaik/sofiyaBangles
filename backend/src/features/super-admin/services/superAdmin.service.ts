import {
  getSuperAdminDashboardData,
  getProductAnalyticsDetailModel,
  getAdminActivityModel,
  getSuperAdminNotificationsModel,
  markNotificationReadModel,
} from "../models/superAdminAnalytics.model";
import {
  getRevenueLedgerModel,
  getPlatformCommissionSettingsModel,
  updatePlatformCommissionSettingsModel,
} from "../../order/models/revenueLedger.model";
import { getAllAdminOrdersModel, getOrderByIdModel, getOrderItemsModel } from "../../order/models/order.model";
import { getAdminProductsModel } from "../../product/models/product.model";

export class SuperAdminService {
  static async getDashboard(params: any) {
    return await getSuperAdminDashboardData(params);
  }

  static async getSalesList(params: { page: number; limit: number; status?: string; search?: string }) {
    const result = await getAllAdminOrdersModel(params);
    const ledgerSnap = await getRevenueLedgerModel({ limit: 1000 });
    
    const ordersWithCommissions = await Promise.all(
      result.orders.map(async (order) => {
        const items = await getOrderItemsModel(order.id);
        const orderLedger = ledgerSnap.items.filter((l) => l.order_id === order.id);
        const admin_share = orderLedger.reduce((sum, l) => sum + l.admin_share_amount, 0);
        const super_admin_share = orderLedger.reduce((sum, l) => sum + l.super_admin_share_amount, 0);

        return {
          ...order,
          items,
          admin_share: Math.round(admin_share * 100) / 100,
          super_admin_share: Math.round(super_admin_share * 100) / 100,
        };
      })
    );

    return {
      orders: ordersWithCommissions,
      total: result.total,
    };
  }

  static async getSaleDetail(id: string) {
    const order = await getOrderByIdModel(id);
    if (!order) {
      throw new Error("ORDER_NOT_FOUND");
    }

    const items = await getOrderItemsModel(id);
    const ledgerSnap = await getRevenueLedgerModel({ limit: 1000 });
    const orderLedger = ledgerSnap.items.filter((l) => l.order_id === id);

    const admin_share = orderLedger.reduce((sum, l) => sum + l.admin_share_amount, 0);
    const super_admin_share = orderLedger.reduce((sum, l) => sum + l.super_admin_share_amount, 0);

    return {
      ...order,
      items,
      ledger: orderLedger,
      admin_share: Math.round(admin_share * 100) / 100,
      super_admin_share: Math.round(super_admin_share * 100) / 100,
    };
  }

  static async getProductsAnalytics(params: { page: number; limit: number }) {
    const productsResult = await getAdminProductsModel(params);
    const ledgerSnap = await getRevenueLedgerModel({ limit: 1000 });

    const analyticsProducts = productsResult.products.map((p) => {
      const pLedger = ledgerSnap.items.filter((l) => l.product_id === p.id);
      const gross_revenue = pLedger.reduce((sum, l) => sum + (l.gross_amount || 0), 0);
      const admin_share = pLedger.reduce((sum, l) => sum + (l.admin_share_amount || 0), 0);
      const super_admin_share = pLedger.reduce((sum, l) => sum + (l.super_admin_share_amount || 0), 0);

      return {
        ...p,
        gross_revenue: Math.round(gross_revenue * 100) / 100,
        admin_share: Math.round(admin_share * 100) / 100,
        super_admin_share: Math.round(super_admin_share * 100) / 100,
      };
    });

    return {
      products: analyticsProducts,
      total: productsResult.total,
    };
  }

  static async getProductAnalyticsDetail(id: string) {
    return await getProductAnalyticsDetailModel(id);
  }

  static async getRevenueLedger(params: any) {
    return await getRevenueLedgerModel(params);
  }

  static async getAdminActivity(params: any) {
    return await getAdminActivityModel(params);
  }

  static async getNotifications(userId: string) {
    return await getSuperAdminNotificationsModel(userId);
  }

  static async markNotificationRead(id: string) {
    return await markNotificationReadModel(id);
  }

  static async getCommissionSettings() {
    return await getPlatformCommissionSettingsModel();
  }

  static async updateCommissionSettings(admin_percentage: number, super_admin_percentage: number, adminId: string) {
    return await updatePlatformCommissionSettingsModel(admin_percentage, super_admin_percentage, adminId);
  }

  static async getSalesCsvData() {
    const result = await getAllAdminOrdersModel({ limit: 1000 });
    const ledgerSnap = await getRevenueLedgerModel({ limit: 1000 });

    let csv = "Order Number,Date,Status,Total Amount,Admin Share (70%),SuperAdmin Share (30%)\n";
    result.orders.forEach((o) => {
      const oLedger = ledgerSnap.items.filter((l) => l.order_id === o.id);
      const aShare = oLedger.reduce((sum, l) => sum + l.admin_share_amount, 0);
      const saShare = oLedger.reduce((sum, l) => sum + l.super_admin_share_amount, 0);

      csv += `"${o.order_number}","${o.created_at}","${o.status}",${o.total_amount},${aShare},${saShare}\n`;
    });
    return csv;
  }

  static async getRevenueCsvData() {
    const result = await getRevenueLedgerModel({ limit: 1000 });
    let csv = "Ledger ID,Order ID,Product ID,Admin ID,Gross Amount,Admin Share,SuperAdmin Share,Transaction Type,Status,Created At\n";
    result.items.forEach((l) => {
      csv += `"${l.id}","${l.order_id}","${l.product_id}","${l.admin_id}",${l.gross_amount},${l.admin_share_amount},${l.super_admin_share_amount},"${l.transaction_type}","${l.status}","${l.created_at}"\n`;
    });
    return csv;
  }

  static async getProductsCsvData() {
    const result = await getAdminProductsModel({ page: 1, limit: 1000 });
    const ledgerSnap = await getRevenueLedgerModel({ limit: 1000 });

    let csv = "Product Code,Name,Price,Stock,Gross Revenue,Admin Share,SuperAdmin Share,Status\n";
    result.products.forEach((p) => {
      const pLedger = ledgerSnap.items.filter((l) => l.product_id === p.id);
      const gross = pLedger.reduce((sum, l) => sum + l.gross_amount, 0);
      const aShare = pLedger.reduce((sum, l) => sum + l.admin_share_amount, 0);
      const saShare = pLedger.reduce((sum, l) => sum + l.super_admin_share_amount, 0);

      csv += `"${p.unique_code}","${p.product_name}",${p.price},${p.quantity},${gross},${aShare},${saShare},"${p.status}"\n`;
    });
    return csv;
  }
}
