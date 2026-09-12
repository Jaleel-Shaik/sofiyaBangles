import { Response } from "express";
import { AuthRequest } from "../../../shared/types";
import { getParam, getQuery } from "../../../shared/utils/params";
import { SuperAdminService } from "../services/superAdmin.service";

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

    const data = await SuperAdminService.getDashboard({
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

    const result = await SuperAdminService.getSalesList({ page, limit, status, search });

    res.json({
      success: true,
      data: result.orders,
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
    const data = await SuperAdminService.getSaleDetail(id);
    res.json({ success: true, data });
  } catch (error: any) {
    if (error.message === "ORDER_NOT_FOUND") {
      res.status(404).json({ success: false, message: "Sale order not found." });
      return;
    }
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

    const result = await SuperAdminService.getProductsAnalytics({ page, limit });

    res.json({
      success: true,
      data: result.products,
      pagination: {
        page,
        limit,
        total: result.total,
        totalPages: Math.ceil(result.total / limit),
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
    const detail = await SuperAdminService.getProductAnalyticsDetail(id);
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

    const result = await SuperAdminService.getRevenueLedger({
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

    const result = await SuperAdminService.getAdminActivity({
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
    const notifications = await SuperAdminService.getNotifications(req.user!.userId);
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
    await SuperAdminService.markNotificationRead(id);
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
    const settings = await SuperAdminService.getCommissionSettings();
    res.json({ success: true, data: settings });
  } catch (error: any) {
    console.error("SuperAdmin getCommissionSettings error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch commission settings." });
  }
};

export const updateCommissionSettings = async (req: AuthRequest, res: Response) => {
  try {
    const { admin_percentage, super_admin_percentage } = req.body;
    const settings = await SuperAdminService.updateCommissionSettings(
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
    const csv = await SuperAdminService.getSalesCsvData();
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
    const csv = await SuperAdminService.getRevenueCsvData();
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
    const csv = await SuperAdminService.getProductsCsvData();
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", 'attachment; filename="products_report.csv"');
    res.status(200).send(csv);
  } catch (error: any) {
    console.error("ExportProductsCsv error:", error);
    res.status(500).json({ success: false, message: "Failed to export products CSV." });
  }
};
