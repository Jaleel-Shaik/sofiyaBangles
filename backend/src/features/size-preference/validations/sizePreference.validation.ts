import { z } from "zod";

export const createSizePreferenceSchema = z.object({
  profile_name: z.string().min(1, "Profile name is required"),
  custom_measurements: z.any().optional(),
  is_default: z.boolean().optional(),
});

export const updateSizePreferenceSchema = createSizePreferenceSchema.partial();
