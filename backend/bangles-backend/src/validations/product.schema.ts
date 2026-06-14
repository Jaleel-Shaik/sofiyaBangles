import { z } from "zod";

export const createProductSchema = z.object({
  product_name: z
    .string()
    .min(2, "Product name must be at least 2 characters")
    .max(200, "Product name must be under 200 characters")
    .trim(),
  description: z
    .string()
    .max(2000, "Description must be under 2000 characters")
    .optional(),
  price: z
    .union([z.string(), z.number()])
    .transform((val) => Number(val))
    .pipe(z.number().positive("Price must be a positive number").max(9999999, "Price is too high")),
  quantity: z
    .union([z.string(), z.number()])
    .transform((val) => Number(val))
    .pipe(z.number().int("Quantity must be a whole number").min(0, "Quantity cannot be negative"))
    .default(0),
  category_id: z.string().uuid("Invalid category ID").optional(),
});

export const updateProductSchema = createProductSchema.partial();

export const updateStockSchema = z.object({
  quantity: z
    .union([z.string(), z.number()])
    .transform((val) => Number(val))
    .pipe(z.number().int("Quantity must be a whole number").min(0, "Quantity cannot be negative")),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type UpdateStockInput = z.infer<typeof updateStockSchema>;
