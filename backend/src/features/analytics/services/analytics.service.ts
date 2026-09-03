import {
  getOverviewAnalyticsModel,
  getProductsByCategoryModel,
  getRecentSignupsModel,
} from "../models/analytics.model";

export const getOverviewAnalyticsService = async (filters?: { category_id?: string; model_type_id?: string }) => {
  return getOverviewAnalyticsModel(filters);
};

export const getProductsByCategoryService = async () => {
  return getProductsByCategoryModel();
};

export const getRecentSignupsService = async (days?: number) => {
  return getRecentSignupsModel(days);
};
