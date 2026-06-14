import { Response } from "express";
import { AuthRequest } from "../types";
import { getParam, getQuery } from "../utils/params";
import {
  broadcastNotificationService,
  getUserNotificationsService,
  markNotificationReadService,
  getUnreadCountService,
} from "../services/notification.service";

export const getNotifications = async (req: AuthRequest, res: Response) => {
  try {
    const page = getQuery(req, "page");
    const limit = getQuery(req, "limit");

    const result = await getUserNotificationsService(
      req.user!.userId,
      page ? Number(page) : undefined,
      limit ? Number(limit) : undefined,
    );

    res.json({
      success: true,
      data: result.notifications,
      pagination: {
        page: Number(page) || 1,
        limit: Number(limit) || 20,
        total: result.total,
        totalPages: Math.ceil(result.total / (Number(limit) || 20)),
      },
    });
  } catch (error: any) {
    console.error("GetNotifications error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch notifications.",
    });
  }
};

export const markAsRead = async (req: AuthRequest, res: Response) => {
  try {
    const id = getParam(req, "id");
    const notification = await markNotificationReadService(id, req.user!.userId);

    res.json({
      success: true,
      data: notification,
      message: "Notification marked as read.",
    });
  } catch (error: any) {
    if (error.message === "NOTIFICATION_NOT_FOUND") {
      res.status(404).json({
        success: false,
        message: "Notification not found.",
      });
      return;
    }
    console.error("MarkAsRead error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to mark notification.",
    });
  }
};

export const broadcastNotification = async (
  req: AuthRequest,
  res: Response,
) => {
  try {
    const result = await broadcastNotificationService(
      req.body,
      req.user!.userId,
    );

    res.status(201).json({
      success: true,
      data: result,
      message: `Notification sent to ${result.sentCount} users.`,
    });
  } catch (error: any) {
    console.error("BroadcastNotification error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to send notification.",
    });
  }
};

export const getUnreadCount = async (req: AuthRequest, res: Response) => {
  try {
    const count = await getUnreadCountService(req.user!.userId);

    res.json({
      success: true,
      data: { count },
    });
  } catch (error: any) {
    console.error("GetUnreadCount error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get unread count.",
    });
  }
};
