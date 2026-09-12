/**
 * Feature Model: SuperAdmin Analytics
 * Re-exports pure data models and interfaces from src/models/superAdmin.model
 * Re-exports database operations from src/db/superAdmin.db for backward-compatible module resolution.
 */

export * from "../../../models/superAdmin.model";
export {
  fetchSuperAdminRawCollectionsDb as fetchSuperAdminRawCollectionsModel,
  fetchProductAnalyticsRawDataDb as fetchProductAnalyticsRawDataModel,
  getSuperAdminNotificationsDb as getSuperAdminNotificationsModel,
  markNotificationReadDb as markNotificationReadModel,
} from "../../../db/superAdmin.db";
export { queryAuditLogsDb as fetchAuditLogsRawModel } from "../../../db/audit.db";

import { SalesAnalyticsQuery, SuperAdminDashboardData, ProductAnalyticsDetail } from "../../../models/superAdmin.model";
import { AuditLog } from "../../../models/audit.model";

/**
 * Calculates date range boundaries based on preset period or explicit from/to dates.
 */
export function resolveDateRange(query: SalesAnalyticsQuery): { from: Date; to: Date } {
  const now = new Date();
  let to = new Date(now);
  let from = new Date(now);

  if (query.fromDate) {
    from = new Date(query.fromDate);
  }
  if (query.toDate) {
    to = new Date(query.toDate);
  }

  if (!query.fromDate && query.period) {
    switch (query.period) {
      case "today":
        from.setHours(0, 0, 0, 0);
        break;
      case "yesterday":
        from.setDate(from.getDate() - 1);
        from.setHours(0, 0, 0, 0);
        to.setDate(to.getDate() - 1);
        to.setHours(23, 59, 59, 999);
        break;
      case "7d":
        from.setDate(from.getDate() - 7);
        break;
      case "30d":
        from.setDate(from.getDate() - 30);
        break;
      case "this_month":
        from = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case "last_month":
        from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        to = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
        break;
      case "this_year":
        from = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        from.setDate(from.getDate() - 30);
    }
  } else if (!query.fromDate) {
    from.setDate(from.getDate() - 30);
  }

  return { from, to };
}

/**
 * Backward compatibility delegation to SuperAdminService.
 */
export const getSuperAdminDashboardData = async (
  query: SalesAnalyticsQuery
): Promise<SuperAdminDashboardData> => {
  const { SuperAdminService } = require("../services/superAdmin.service");
  return await SuperAdminService.getDashboard(query);
};

export const getProductAnalyticsDetailModel = async (
  productId: string
): Promise<ProductAnalyticsDetail> => {
  const { SuperAdminService } = require("../services/superAdmin.service");
  return await SuperAdminService.getProductAnalyticsDetail(productId);
};

export const getAdminActivityModel = async (options: {
  page?: number;
  limit?: number;
  actorId?: string;
  action?: string;
}): Promise<{ items: (AuditLog & { actor_name?: string; actor_email?: string; actor_role?: string })[]; total: number }> => {
  const { SuperAdminService } = require("../services/superAdmin.service");
  return await SuperAdminService.getAdminActivity(options);
};
