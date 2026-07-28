import { z } from "zod";

export const broadcastNotificationSchema = z.object({
  title: z
    .string()
    .min(2, "Title must be at least 2 characters")
    .max(200, "Title must be under 200 characters")
    .trim(),
  body: z
    .string()
    .max(1000, "Body must be under 1000 characters")
    .optional(),
  type: z
    .enum(["new_arrival", "announcement", "offer", "general"])
    .default("announcement"),
  product_id: z.string().uuid("Invalid product ID").optional().nullable(),
});

export type BroadcastNotificationInput = z.infer<typeof broadcastNotificationSchema>;
