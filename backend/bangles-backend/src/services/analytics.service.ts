import {
  getOverviewAnalyticsRepo,
  getProductsByCategoryRepo,
  getRecentSignupsRepo,
} from "../repositories/analytics.repository";

export const getOverviewAnalyticsService = async () => {
  return getOverviewAnalyticsRepo();
};

export const getProductsByCategoryService = async () => {
  return getProductsByCategoryRepo();
};

export const getRecentSignupsService = async (days?: number) => {
  return getRecentSignupsRepo(days);
};
