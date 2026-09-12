import { z } from "zod";

export const createSizePreferenceSchema = z.object({
  profile_name: z.string().min(1, "Profile name is required"),
  category_id: z.string().optional(),
  is_custom: z.boolean().optional().default(false),
  standard_size: z.string().optional(),
  custom_measurements: z.any().optional(),
  is_default: z.boolean().optional(),
});

export const updateSizePreferenceSchema = createSizePreferenceSchema.partial();
