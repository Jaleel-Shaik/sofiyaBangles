import { Response } from "express";
import { AuthRequest } from "../../../shared/types";
import { getQuery } from "../../../shared/utils/params";
import { asyncHandler } from "../../../core/utils/async-handler";
import { sendSuccess } from "../../../core/utils/response";
import {
  getOverviewAnalyticsService,
  getProductsByCategoryService,
  getRecentSignupsService,
} from "../services/analytics.service";

export const getOverview = asyncHandler(async (req: AuthRequest, res: Response) => {
  const category_id = getQuery(req, "category_id");
  const model_type_id = getQuery(req, "model_type_id");
  const analytics = await getOverviewAnalyticsService({ category_id, model_type_id });
  return sendSuccess(res, analytics);
});

export const getProductsByCategory = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const data = await getProductsByCategoryService();
  return sendSuccess(res, data);
});

export const getRecentSignups = asyncHandler(async (req: AuthRequest, res: Response) => {
  const days = getQuery(req, "days");
  const data = await getRecentSignupsService(days ? Number(days) : undefined);
  return sendSuccess(res, data);
});
