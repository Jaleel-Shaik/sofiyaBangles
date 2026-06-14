import { Response } from "express";
import { AuthRequest } from "../types";
import { getQuery } from "../utils/params";
import {
  getOverviewAnalyticsService,
  getProductsByCategoryService,
  getRecentSignupsService,
} from "../services/analytics.service";

export const getOverview = async (_req: AuthRequest, res: Response) => {
  try {
    const analytics = await getOverviewAnalyticsService();

    res.json({
      success: true,
      data: analytics,
    });
  } catch (error: any) {
    console.error("GetOverview error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch analytics.",
    });
  }
};

export const getProductsByCategory = async (
  _req: AuthRequest,
  res: Response,
) => {
  try {
    const data = await getProductsByCategoryService();

    res.json({
      success: true,
      data,
    });
  } catch (error: any) {
    console.error("GetProductsByCategory error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch analytics.",
    });
  }
};

export const getRecentSignups = async (req: AuthRequest, res: Response) => {
  try {
    const days = getQuery(req, "days");
    const data = await getRecentSignupsService(days ? Number(days) : undefined);

    res.json({
      success: true,
      data,
    });
  } catch (error: any) {
    console.error("GetRecentSignups error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch analytics.",
    });
  }
};
