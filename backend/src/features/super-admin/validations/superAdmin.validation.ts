import { z } from "zod";

export const createAdminSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  name: z.string().min(2, "Name must be at least 2 characters"),
  role: z.enum(["admin", "super_admin"]),
});

export const updateAdminStatusSchema = z.object({
  is_active: z.boolean(),
});

export const updateCommissionSettingsSchema = z.object({
  platform_fee_percent: z.number().min(0).max(100, "Fee must be between 0 and 100").optional(),
  delivery_fee: z.number().min(0, "Delivery fee cannot be negative").optional(),
});
