import { z } from "zod";

export const updateBusinessProfileSchema = z.object({
  store_name: z.string().min(2).max(100).trim().optional(),
  description: z.string().max(2000).optional(),
  business_hours: z.string().max(200).optional(),
  address: z.string().max(300).optional(),
  whatsapp_number: z.string().max(20).optional(),
  email: z.string().email().optional(),
  phone_number: z.string().max(20).optional(),
});
