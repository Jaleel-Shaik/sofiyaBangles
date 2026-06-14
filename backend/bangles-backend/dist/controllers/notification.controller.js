"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUnreadCount = exports.broadcastNotification = exports.markAsRead = exports.getNotifications = void 0;
const params_1 = require("../utils/params");
const notification_service_1 = require("../services/notification.service");
const getNotifications = async (req, res) => {
    try {
        const page = (0, params_1.getQuery)(req, "page");
        const limit = (0, params_1.getQuery)(req, "limit");
        const result = await (0, notification_service_1.getUserNotificationsService)(req.user.userId, page ? Number(page) : undefined, limit ? Number(limit) : undefined);
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
    }
    catch (error) {
        console.error("GetNotifications error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch notifications.",
        });
    }
};
exports.getNotifications = getNotifications;
const markAsRead = async (req, res) => {
    try {
        const id = (0, params_1.getParam)(req, "id");
        const notification = await (0, notification_service_1.markNotificationReadService)(id, req.user.userId);
        res.json({
            success: true,
            data: notification,
            message: "Notification marked as read.",
        });
    }
    catch (error) {
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
exports.markAsRead = markAsRead;
const broadcastNotification = async (req, res) => {
    try {
        const result = await (0, notification_service_1.broadcastNotificationService)(req.body, req.user.userId);
        res.status(201).json({
            success: true,
            data: result,
            message: `Notification sent to ${result.sentCount} users.`,
        });
    }
    catch (error) {
        console.error("BroadcastNotification error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to send notification.",
        });
    }
};
exports.broadcastNotification = broadcastNotification;
const getUnreadCount = async (req, res) => {
    try {
        const count = await (0, notification_service_1.getUnreadCountService)(req.user.userId);
        res.json({
            success: true,
            data: { count },
        });
    }
    catch (error) {
        console.error("GetUnreadCount error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to get unread count.",
        });
    }
};
exports.getUnreadCount = getUnreadCount;
