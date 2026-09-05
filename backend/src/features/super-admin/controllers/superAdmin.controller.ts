import { Response } from "express";
import { AuthRequest } from "../../../shared/types";
import { getParam, getQuery } from "../../../shared/utils/params";
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
import { getAdminProductsModel, getProductByIdModel } from "../../product/models/product.model";

/**
 * SuperAdmin Dashboard KPI & Overview Handler
 */
export const getDashboard = async (req: AuthRequest, res: Response) => {
  try {
    const period = getQuery(req, "period") as any;
    const fromDate = getQuery(req, "fromDate");
    const toDate = getQuery(req, "toDate");
    const categoryId = getQuery(req, "categoryId");
    const modelTypeId = getQuery(req, "modelTypeId");
    const adminId = getQuery(req, "adminId");

    const data = await getSuperAdminDashboardData({
      period,
      fromDate,
      toDate,
      categoryId,
      modelTypeId,
      adminId,
    });

    res.json({ success: true, data });
  } catch (error: any) {
    console.error("SuperAdmin getDashboard error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch dashboard analytics." });
  }
};

/**
 * Sales Analytics & Listing Handler
 */
export const getSalesList = async (req: AuthRequest, res: Response) => {
  try {
    const page = getQuery(req, "page") ? Number(getQuery(req, "page")) : 1;
    const limit = getQuery(req, "limit") ? Number(getQuery(req, "limit")) : 20;
    const status = getQuery(req, "status");
    const search = getQuery(req, "search");

    const result = await getAllAdminOrdersModel({ page, limit, status, search });
    
    // Attach ledger 70/30 commission details for each order
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

    res.json({
      success: true,
      data: ordersWithCommissions,
      pagination: {
        page,
        limit,
        total: result.total,
        totalPages: Math.ceil(result.total / limit),
      },
    });
  } catch (error: any) {
    console.error("SuperAdmin getSalesList error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch sales list." });
  }
};

/**
 * Single Sale Detail Handler
 */
export const getSaleDetail = async (req: AuthRequest, res: Response) => {
  try {
    const id = getParam(req, "id");
    const order = await getOrderByIdModel(id);
    if (!order) {
      res.status(404).json({ success: false, message: "Sale order not found." });
      return;
    }

    const items = await getOrderItemsModel(id);
    const ledgerSnap = await getRevenueLedgerModel({ limit: 1000 });
    const orderLedger = ledgerSnap.items.filter((l) => l.order_id === id);

    const admin_share = orderLedger.reduce((sum, l) => sum + l.admin_share_amount, 0);
    const super_admin_share = orderLedger.reduce((sum, l) => sum + l.super_admin_share_amount, 0);

    res.json({
      success: true,
      data: {
        ...order,
        items,
        ledger: orderLedger,
        admin_share: Math.round(admin_share * 100) / 100,
        super_admin_share: Math.round(super_admin_share * 100) / 100,
      },
    });
  } catch (error: any) {
    console.error("SuperAdmin getSaleDetail error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch sale details." });
  }
};

/**
 * Products Analytics List Handler
 */
export const getProductsAnalytics = async (req: AuthRequest, res: Response) => {
  try {
    const page = getQuery(req, "page") ? Number(getQuery(req, "page")) : 1;
    const limit = getQuery(req, "limit") ? Number(getQuery(req, "limit")) : 20;

    const productsResult = await getAdminProductsModel({ page, limit });
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

    res.json({
      success: true,
      data: analyticsProducts,
      pagination: {
        page,
        limit,
        total: productsResult.total,
        totalPages: Math.ceil(productsResult.total / limit),
      },
    });
  } catch (error: any) {
    console.error("SuperAdmin getProductsAnalytics error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch product analytics." });
  }
};

/**
 * Single Product Analytics Detail Handler (Drill-down)
 */
export const getProductAnalyticsDetail = async (req: AuthRequest, res: Response) => {
  try {
    const id = getParam(req, "id");
    const detail = await getProductAnalyticsDetailModel(id);
    res.json({ success: true, data: detail });
  } catch (error: any) {
    if (error.message === "PRODUCT_NOT_FOUND") {
      res.status(404).json({ success: false, message: "Product not found." });
      return;
    }
    console.error("SuperAdmin getProductAnalyticsDetail error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch product detail analytics." });
  }
};

/**
 * Financial Revenue Ledger Handler
 */
export const getRevenueLedger = async (req: AuthRequest, res: Response) => {
  try {
    const page = getQuery(req, "page") ? Number(getQuery(req, "page")) : 1;
    const limit = getQuery(req, "limit") ? Number(getQuery(req, "limit")) : 20;
    const fromDate = getQuery(req, "fromDate");
    const toDate = getQuery(req, "toDate");
    const transactionType = getQuery(req, "transactionType") as any;
    const adminId = getQuery(req, "adminId");

    const result = await getRevenueLedgerModel({
      page,
      limit,
      fromDate,
      toDate,
      transactionType,
      adminId,
    });

    res.json({
      success: true,
      data: result.items,
      pagination: {
        page,
        limit,
        total: result.total,
        totalPages: Math.ceil(result.total / limit),
      },
    });
  } catch (error: any) {
    console.error("SuperAdmin getRevenueLedger error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch revenue ledger." });
  }
};

/**
 * Admin Activity / Audit Log Handler
 */
export const getAdminActivity = async (req: AuthRequest, res: Response) => {
  try {
    const page = getQuery(req, "page") ? Number(getQuery(req, "page")) : 1;
    const limit = getQuery(req, "limit") ? Number(getQuery(req, "limit")) : 20;
    const actorId = getQuery(req, "actorId");
    const action = getQuery(req, "action");

    const result = await getAdminActivityModel({
      page,
      limit,
      actorId,
      action,
    });

    res.json({
      success: true,
      data: result.items,
      pagination: {
        page,
        limit,
        total: result.total,
        totalPages: Math.ceil(result.total / limit),
      },
    });
  } catch (error: any) {
    console.error("SuperAdmin getAdminActivity error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch admin activity." });
  }
};

/**
 * SuperAdmin Notifications Handler
 */
export const getNotifications = async (req: AuthRequest, res: Response) => {
  try {
    const notifications = await getSuperAdminNotificationsModel(req.user?.userId);
    res.json({ success: true, data: notifications });
  } catch (error: any) {
    console.error("SuperAdmin getNotifications error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch notifications." });
  }
};

/**
 * Mark Notification Read Handler
 */
export const markNotificationRead = async (req: AuthRequest, res: Response) => {
  try {
    const id = getParam(req, "id");
    await markNotificationReadModel(id);
    res.json({ success: true, message: "Notification marked as read." });
  } catch (error: any) {
    console.error("SuperAdmin markNotificationRead error:", error);
    res.status(500).json({ success: false, message: "Failed to update notification." });
  }
};

/**
 * Commission Settings Get & Update Handlers
 */
export const getCommissionSettings = async (req: AuthRequest, res: Response) => {
  try {
    const settings = await getPlatformCommissionSettingsModel();
    res.json({ success: true, data: settings });
  } catch (error: any) {
    console.error("SuperAdmin getCommissionSettings error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch commission settings." });
  }
};

export const updateCommissionSettings = async (req: AuthRequest, res: Response) => {
  try {
    const { admin_percentage, super_admin_percentage } = req.body;
    const settings = await updatePlatformCommissionSettingsModel(
      Number(admin_percentage),
      Number(super_admin_percentage),
      req.user!.userId
    );
    res.json({ success: true, data: settings, message: "Commission settings updated successfully." });
  } catch (error: any) {
    if (error.message === "INVALID_COMMISSION_PERCENTAGE") {
      res.status(400).json({ success: false, message: "Percentages must sum to exactly 100%." });
      return;
    }
    console.error("SuperAdmin updateCommissionSettings error:", error);
    res.status(500).json({ success: false, message: "Failed to update commission settings." });
  }
};

/**
 * CSV Data Export Handlers
 */
export const exportSalesCsv = async (req: AuthRequest, res: Response) => {
  try {
    const result = await getAllAdminOrdersModel({ limit: 1000 });
    const ledgerSnap = await getRevenueLedgerModel({ limit: 1000 });

    let csv = "Order Number,Date,Status,Total Amount,Admin Share (70%),SuperAdmin Share (30%)\n";
    result.orders.forEach((o) => {
      const oLedger = ledgerSnap.items.filter((l) => l.order_id === o.id);
      const aShare = oLedger.reduce((sum, l) => sum + l.admin_share_amount, 0);
      const saShare = oLedger.reduce((sum, l) => sum + l.super_admin_share_amount, 0);

      csv += `"${o.order_number}","${o.created_at}","${o.status}",${o.total_amount},${aShare},${saShare}\n`;
    });

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", 'attachment; filename="sales_report.csv"');
    res.status(200).send(csv);
  } catch (error: any) {
    console.error("ExportSalesCsv error:", error);
    res.status(500).json({ success: false, message: "Failed to export sales CSV." });
  }
};

export const exportRevenueCsv = async (req: AuthRequest, res: Response) => {
  try {
    const result = await getRevenueLedgerModel({ limit: 1000 });

    let csv = "Ledger ID,Order ID,Product ID,Admin ID,Gross Amount,Admin Share,SuperAdmin Share,Transaction Type,Status,Created At\n";
    result.items.forEach((l) => {
      csv += `"${l.id}","${l.order_id}","${l.product_id}","${l.admin_id}",${l.gross_amount},${l.admin_share_amount},${l.super_admin_share_amount},"${l.transaction_type}","${l.status}","${l.created_at}"\n`;
    });

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", 'attachment; filename="revenue_ledger.csv"');
    res.status(200).send(csv);
  } catch (error: any) {
    console.error("ExportRevenueCsv error:", error);
    res.status(500).json({ success: false, message: "Failed to export revenue CSV." });
  }
};

export const exportProductsCsv = async (req: AuthRequest, res: Response) => {
  try {
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

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", 'attachment; filename="products_report.csv"');
    res.status(200).send(csv);
  } catch (error: any) {
    console.error("ExportProductsCsv error:", error);
    res.status(500).json({ success: false, message: "Failed to export products CSV." });
  }
};
