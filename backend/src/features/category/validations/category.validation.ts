import { z } from "zod";

export const createCategorySchema = z.object({
  category_name: z
    .string()
    .min(2, "Category name must be at least 2 characters")
    .max(100, "Category name must be under 100 characters")
    .trim(),
  image_url: z.string().url("Invalid image URL").optional(),
  display_order: z
    .union([z.string(), z.number()])
    .transform((val) => Number(val))
    .pipe(z.number().int().min(0))
    .default(0),
  model_type_id: z.string().optional(),
  size_type: z.enum(["none", "standard", "custom", "both"]).optional(),
  standard_sizes: z.preprocess((val) => {
    if (typeof val === 'string') {
      try { return JSON.parse(val); } catch (e) { return []; }
    }
    return val;
  }, z.array(z.string()).optional()),
  custom_measurement_fields: z.preprocess((val) => {
    if (typeof val === 'string') {
      try { return JSON.parse(val); } catch (e) { return []; }
    }
    return val;
  }, z.array(z.string()).optional()),
});

export const updateCategorySchema = createCategorySchema.partial();

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
