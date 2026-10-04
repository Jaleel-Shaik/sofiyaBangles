import { Response } from "express";
import { AuthRequest } from "../../../shared/types";
import { getParam, getQuery } from "../../../shared/utils/params";
import { asyncHandler } from "../../../core/utils/async-handler";
import { sendSuccess } from "../../../core/utils/response";
import {
  broadcastNotificationService,
  getUserNotificationsService,
  markNotificationReadService,
  markAllNotificationsReadService,
  deleteNotificationService,
  clearAllNotificationsService,
  getUnreadCountService,
} from "../services/notification.service";
import { NotFoundError } from "../../../core/errors/app.error";

export const getNotifications = asyncHandler(async (req: AuthRequest, res: Response) => {
  const page = getQuery(req, "page");
  const limit = getQuery(req, "limit");

  const pageNum = Number(page) || 1;
  const limitNum = Number(limit) || 20;

  const userId = req.user?.userId || null;

  const result = await getUserNotificationsService(
    userId,
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

export const markAllAsRead = asyncHandler(async (req: AuthRequest, res: Response) => {
  const count = await markAllNotificationsReadService(req.user!.userId);
  return sendSuccess(res, { count }, "All notifications marked as read.");
});

export const deleteNotification = asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = getParam(req, "id");
  try {
    const result = await deleteNotificationService(id, req.user?.userId);
    return sendSuccess(res, result, "Notification deleted.");
  } catch (err: any) {
    if (err.message === "NOTIFICATION_NOT_FOUND") {
      throw new NotFoundError("Notification not found.");
    }
    throw err;
  }
});

export const clearAllNotifications = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await clearAllNotificationsService(req.user!.userId);
  return sendSuccess(res, result, "All notifications cleared.");
});

export const broadcastNotification = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await broadcastNotificationService(req.body, req.user!.userId);
  return sendSuccess(res, result, {
    message: `Notification sent to ${result.sentCount} users.`,
    statusCode: 201,
  });
});

export const getUnreadCount = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user?.userId || null;
  const count = await getUnreadCountService(userId);
  return sendSuccess(res, { count });
});

