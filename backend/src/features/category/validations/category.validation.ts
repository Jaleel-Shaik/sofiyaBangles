import { z } from "zod";
import { zStringNumber, zJsonArray } from "../../../shared/utils/validation.utils";

export const createCategorySchema = z.object({
  category_name: z
    .string()
    .min(2, "Category name must be at least 2 characters")
    .max(100, "Category name must be under 100 characters")
    .trim(),
  image_url: z.string().url("Invalid image URL").optional(),
  display_order: zStringNumber
    .pipe(z.number().int().min(0))
    .default(0),
  model_type_id: z.string().min(1, "Model Type is required"),
  size_type: z.enum(["none", "standard", "custom", "both"]).optional(),
  standard_sizes: zJsonArray.pipe(z.array(z.string())).optional(),
  custom_measurement_fields: zJsonArray.pipe(z.array(z.string())).optional(),
});

export const updateCategorySchema = createCategorySchema.partial();

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
