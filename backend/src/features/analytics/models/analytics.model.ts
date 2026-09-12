/**
 * Feature Model: Analytics
 * Re-exports pure data models from src/models/analytics.model
 * Re-exports calculation services for backward-compatible module resolution.
 */

export * from "../../../models/analytics.model";
import {
  getOverviewAnalyticsService,
  getProductsByCategoryService,
  getRecentSignupsService,
} from "../services/analytics.service";

export {
  getOverviewAnalyticsService as getOverviewAnalyticsModel,
  getProductsByCategoryService as getProductsByCategoryModel,
  getRecentSignupsService as getRecentSignupsModel,
};
