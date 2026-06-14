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
});

export const updateCategorySchema = createCategorySchema.partial();

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
