"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRecentSignups = exports.getProductsByCategory = exports.getOverview = void 0;
const params_1 = require("../utils/params");
const analytics_service_1 = require("../services/analytics.service");
const getOverview = async (_req, res) => {
    try {
        const analytics = await (0, analytics_service_1.getOverviewAnalyticsService)();
        res.json({
            success: true,
            data: analytics,
        });
    }
    catch (error) {
        console.error("GetOverview error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch analytics.",
        });
    }
};
exports.getOverview = getOverview;
const getProductsByCategory = async (_req, res) => {
    try {
        const data = await (0, analytics_service_1.getProductsByCategoryService)();
        res.json({
            success: true,
            data,
        });
    }
    catch (error) {
        console.error("GetProductsByCategory error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch analytics.",
        });
    }
};
exports.getProductsByCategory = getProductsByCategory;
const getRecentSignups = async (req, res) => {
    try {
        const days = (0, params_1.getQuery)(req, "days");
        const data = await (0, analytics_service_1.getRecentSignupsService)(days ? Number(days) : undefined);
        res.json({
            success: true,
            data,
        });
    }
    catch (error) {
        console.error("GetRecentSignups error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch analytics.",
        });
    }
};
exports.getRecentSignups = getRecentSignups;
