"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.broadcastNotificationSchema = void 0;
const zod_1 = require("zod");
exports.broadcastNotificationSchema = zod_1.z.object({
    title: zod_1.z
        .string()
        .min(2, "Title must be at least 2 characters")
        .max(200, "Title must be under 200 characters")
        .trim(),
    body: zod_1.z
        .string()
        .max(1000, "Body must be under 1000 characters")
        .optional(),
    type: zod_1.z
        .enum(["new_arrival", "announcement", "offer", "general"])
        .default("announcement"),
    product_id: zod_1.z.string().uuid("Invalid product ID").optional().nullable(),
});
