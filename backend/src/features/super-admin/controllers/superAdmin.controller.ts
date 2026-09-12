import type { Response } from "express";
import { AuthRequest, SalesAnalyticsQuery, RevenueTransactionType } from "../../../shared/types";
import { getParam, getQuery } from "../../../shared/utils/params";
import { asyncHandler } from "../../../core/utils/async-handler";
import { sendSuccess } from "../../../core/utils/response";
import { SuperAdminService } from "../services/superAdmin.service";

/**
 * SuperAdmin Dashboard KPI & Overview Handler
 */
export const getDashboard = asyncHandler(async (req: AuthRequest, res: Response) => {
  const period = getQuery(req, "period") as SalesAnalyticsQuery["period"];
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

  return sendSuccess(res, data);
});

/**
 * Sales Analytics & Listing Handler
 */
export const getSalesList = asyncHandler(async (req: AuthRequest, res: Response) => {
  const page = getQuery(req, "page") ? Number(getQuery(req, "page")) : 1;
  const limit = getQuery(req, "limit") ? Number(getQuery(req, "limit")) : 20;
  const status = getQuery(req, "status");
  const search = getQuery(req, "search");

  const result = await SuperAdminService.getSalesList({ page, limit, status, search });

  return sendSuccess(res, result.orders, {
    pagination: {
      page,
      limit,
      total: result.total,
      totalPages: Math.ceil(result.total / limit),
    },
  });
});

/**
 * Single Sale Detail Handler
 */
export const getSaleDetail = asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = getParam(req, "id");
  const data = await SuperAdminService.getSaleDetail(id);
  return sendSuccess(res, data);
});

/**
 * Products Analytics List Handler
 */
export const getProductsAnalytics = asyncHandler(async (req: AuthRequest, res: Response) => {
  const page = getQuery(req, "page") ? Number(getQuery(req, "page")) : 1;
  const limit = getQuery(req, "limit") ? Number(getQuery(req, "limit")) : 20;

  const result = await SuperAdminService.getProductsAnalytics({ page, limit });

  return sendSuccess(res, result.products, {
    pagination: {
      page,
      limit,
      total: result.total,
      totalPages: Math.ceil(result.total / limit),
    },
  });
});

/**
 * Single Product Analytics Detail Handler (Drill-down)
 */
export const getProductAnalyticsDetail = asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = getParam(req, "id");
  const detail = await SuperAdminService.getProductAnalyticsDetail(id);
  return sendSuccess(res, detail);
});

/**
 * Financial Revenue Ledger Handler
 */
export const getRevenueLedger = asyncHandler(async (req: AuthRequest, res: Response) => {
  const page = getQuery(req, "page") ? Number(getQuery(req, "page")) : 1;
  const limit = getQuery(req, "limit") ? Number(getQuery(req, "limit")) : 20;
  const fromDate = getQuery(req, "fromDate");
  const toDate = getQuery(req, "toDate");
  const transactionType = getQuery(req, "transactionType") as RevenueTransactionType | undefined;
  const adminId = getQuery(req, "adminId");

  const result = await SuperAdminService.getRevenueLedger({
    page,
    limit,
    fromDate,
    toDate,
    transactionType,
    adminId,
  });

  return sendSuccess(res, result.items, {
    pagination: {
      page,
      limit,
      total: result.total,
      totalPages: Math.ceil(result.total / limit),
    },
  });
});

/**
 * Admin Activity / Audit Log Handler
 */
export const getAdminActivity = asyncHandler(async (req: AuthRequest, res: Response) => {
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

  return sendSuccess(res, result.items, {
    pagination: {
      page,
      limit,
      total: result.total,
      totalPages: Math.ceil(result.total / limit),
    },
  });
});

/**
 * SuperAdmin Notifications Handler
 */
export const getNotifications = asyncHandler(async (req: AuthRequest, res: Response) => {
  const notifications = await SuperAdminService.getNotifications(req.user!.userId);
  return sendSuccess(res, notifications);
});

/**
 * Mark Notification Read Handler
 */
export const markNotificationRead = asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = getParam(req, "id");
  await SuperAdminService.markNotificationRead(id);
  return sendSuccess(res, null, { message: "Notification marked as read." });
});

/**
 * Commission Settings Get & Update Handlers
 */
export const getCommissionSettings = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const settings = await SuperAdminService.getCommissionSettings();
  return sendSuccess(res, settings);
});

export const updateCommissionSettings = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { admin_percentage, super_admin_percentage } = req.body;
  const settings = await SuperAdminService.updateCommissionSettings(
    Number(admin_percentage),
    Number(super_admin_percentage),
    req.user!.userId
  );
  return sendSuccess(res, settings, { message: "Commission settings updated successfully." });
});

/**
 * CSV Data Export Handlers
 */
export const exportSalesCsv = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const csv = await SuperAdminService.getSalesCsvData();
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", 'attachment; filename="sales_report.csv"');
  return res.status(200).send(csv);
});

export const exportRevenueCsv = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const csv = await SuperAdminService.getRevenueCsvData();
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", 'attachment; filename="revenue_ledger.csv"');
  return res.status(200).send(csv);
});

export const exportProductsCsv = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const csv = await SuperAdminService.getProductsCsvData();
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", 'attachment; filename="products_report.csv"');
  return res.status(200).send(csv);
});
