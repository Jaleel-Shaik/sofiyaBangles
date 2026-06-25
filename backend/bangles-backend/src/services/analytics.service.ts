import {
  getOverviewAnalyticsModel,
  getProductsByCategoryModel,
  getRecentSignupsModel,
} from "../models/analytics.model";

export const getOverviewAnalyticsService = async () => {
  return getOverviewAnalyticsModel();
};

export const getProductsByCategoryService = async () => {
  return getProductsByCategoryModel();
};

export const getRecentSignupsService = async (days?: number) => {
  return getRecentSignupsModel(days);
};
