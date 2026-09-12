import { z } from "zod";

export const upsertCartItemSchema = z.object({
  product_id: z.string().min(1, "Product ID is required"),
  variant_id: z.string().nullable().optional(),
  quantity: z.number().int().min(1, "Quantity must be at least 1").max(999, "Quantity cannot exceed 999"),
});

export type UpsertCartItemInput = z.infer<typeof upsertCartItemSchema>;
