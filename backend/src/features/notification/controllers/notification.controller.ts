import { Response } from "express";
import { AuthRequest } from "../../../shared/types";
import { getParam, getQuery } from "../../../shared/utils/params";
import { asyncHandler } from "../../../core/utils/async-handler";
import { sendSuccess } from "../../../core/utils/response";
import {
  broadcastNotificationService,
  getUserNotificationsService,
  markNotificationReadService,
  getUnreadCountService,
} from "../services/notification.service";
import { NotFoundError } from "../../../core/errors/app.error";

export const getNotifications = asyncHandler(async (req: AuthRequest, res: Response) => {
  const page = getQuery(req, "page");
  const limit = getQuery(req, "limit");

  const pageNum = Number(page) || 1;
  const limitNum = Number(limit) || 20;

  const result = await getUserNotificationsService(
    req.user!.userId,
    page ? pageNum : undefined,
    limit ? limitNum : undefined
  );

  return sendSuccess(res, result.notifications, {
    pagination: {
      page: pageNum,
      limit: limitNum,
      total: result.total,
      totalPages: Math.ceil(result.total / limitNum),
    },
  });
});

export const markAsRead = asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = getParam(req, "id");
  try {
    const notification = await markNotificationReadService(id, req.user!.userId);
    return sendSuccess(res, notification, "Notification marked as read.");
  } catch (err: any) {
    if (err.message === "NOTIFICATION_NOT_FOUND") {
      throw new NotFoundError("Notification not found.");
    }
    throw err;
  }
});

export const broadcastNotification = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await broadcastNotificationService(req.body, req.user!.userId);
  return sendSuccess(res, result, {
    message: `Notification sent to ${result.sentCount} users.`,
    statusCode: 201,
  });
});

export const getUnreadCount = asyncHandler(async (req: AuthRequest, res: Response) => {
  const count = await getUnreadCountService(req.user!.userId);
  return sendSuccess(res, { count });
});
