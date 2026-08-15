import { z } from "zod";

export const createProductSchema = z.object({
  unique_code: z
    .string()
    .max(50, "Unique code must be under 50 characters")
    .trim()
    .optional(),
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
  category_id: z.string().min(1, "Category is required"),
  model_type_id: z.string().min(1, "Model Type is required"),
  status: z.enum(["draft", "active", "out_of_stock", "archived"]).optional(),
  is_active: z
    .union([z.boolean(), z.string()])
    .transform((val) => val === true || val === "true")
    .optional()
    .default(true),
  images: z.union([z.array(z.any()), z.string()])
    .transform((val) => {
      if (typeof val === "string") {
        try {
          return JSON.parse(val);
        } catch {
          return [];
        }
      }
      return val;
    })
    .optional()
    .default([]),
  likes: z.number().int().min(0).default(0).optional(),
  rating: z.number().min(0).max(5).default(0).optional(),
  reviews: z.number().int().min(0).default(0).optional(),
  has_variants: z
    .union([z.boolean(), z.string()])
    .transform((val) => val === true || val === "true")
    .optional()
    .default(false),
  variants: z
    .union([z.array(z.any()), z.string()])
    .transform((val) => {
      if (typeof val === "string") {
        try {
          return JSON.parse(val);
        } catch {
          return [];
        }
      }
      return val;
    })
    .optional()
    .default([]),
  accepts_custom_size: z
    .union([z.boolean(), z.string()])
    .transform((val) => val === true || val === "true")
    .optional()
    .default(false),
  custom_size_price: z
    .union([z.string(), z.number()])
    .optional()
    .transform((val) => {
      if (val === "" || val === undefined || val === null) return undefined;
      const num = Number(val);
      return isNaN(num) ? undefined : num;
    })
    .pipe(z.number().positive("Price must be positive").max(9999999, "Price too high").optional())
    .optional(),
});

export const updateProductSchema = createProductSchema.partial().extend({
  existing_images: z.union([z.string(), z.array(z.string())]).optional(),
});

export const updateStockSchema = z.object({
  quantity: z
    .union([z.string(), z.number()])
    .transform((val) => Number(val))
    .pipe(z.number().int("Quantity must be a whole number").min(0, "Quantity cannot be negative")),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type UpdateStockInput = z.infer<typeof updateStockSchema>;
