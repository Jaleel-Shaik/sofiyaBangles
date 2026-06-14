"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUnreadCountService = exports.markNotificationReadService = exports.getUserNotificationsService = exports.broadcastNotificationService = void 0;
const notification_repository_1 = require("../repositories/notification.repository");
const audit_repository_1 = require("../repositories/audit.repository");
const broadcastNotificationService = async (input, actorId) => {
    const sentCount = await (0, notification_repository_1.broadcastNotificationRepo)({
        title: input.title,
        body: input.body,
        type: input.type,
        product_id: input.product_id,
        sent_by: actorId,
    });
    await (0, audit_repository_1.createAuditLogRepo)({
        actor_id: actorId,
        action: "NOTIFICATION_BROADCAST",
        table_name: "notifications",
        new_data: { title: input.title, sent_to_count: sentCount },
    });
    return { sentCount };
};
exports.broadcastNotificationService = broadcastNotificationService;
const getUserNotificationsService = async (userId, page, limit) => {
    return (0, notification_repository_1.getUserNotificationsRepo)(userId, page, limit);
};
exports.getUserNotificationsService = getUserNotificationsService;
const markNotificationReadService = async (id, userId) => {
    const notification = await (0, notification_repository_1.markNotificationReadRepo)(id, userId);
    if (!notification) {
        throw new Error("NOTIFICATION_NOT_FOUND");
    }
    return notification;
};
exports.markNotificationReadService = markNotificationReadService;
const getUnreadCountService = async (userId) => {
    return (0, notification_repository_1.getUnreadCountRepo)(userId);
};
exports.getUnreadCountService = getUnreadCountService;
