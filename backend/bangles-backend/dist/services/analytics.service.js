"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRecentSignupsService = exports.getProductsByCategoryService = exports.getOverviewAnalyticsService = void 0;
const analytics_repository_1 = require("../repositories/analytics.repository");
const getOverviewAnalyticsService = async () => {
    return (0, analytics_repository_1.getOverviewAnalyticsRepo)();
};
exports.getOverviewAnalyticsService = getOverviewAnalyticsService;
const getProductsByCategoryService = async () => {
    return (0, analytics_repository_1.getProductsByCategoryRepo)();
};
exports.getProductsByCategoryService = getProductsByCategoryService;
const getRecentSignupsService = async (days) => {
    return (0, analytics_repository_1.getRecentSignupsRepo)(days);
};
exports.getRecentSignupsService = getRecentSignupsService;
