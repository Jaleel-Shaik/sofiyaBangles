import { z } from "zod";

export const createOrderSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().optional(),
        product_id: z.string().optional(),
        product_name: z.string().optional(),
        quantity: z.coerce.number().int().positive("Quantity must be positive"),
        price: z.coerce.number().nonnegative("Price cannot be negative").optional(),
        size: z.string().optional(),
        color: z.string().optional(),
        image_url: z.string().nullable().optional(),
        variantId: z.string().nullable().optional(),
        variant_id: z.string().nullable().optional(),
      }).refine((item) => Boolean(item.productId || item.product_id), {
        message: "Product ID is required",
      })
    )
    .min(1, "Order must contain at least one item"),
  shippingAddressSnapshot: z
    .object({
      full_name: z.string().optional(),
      name: z.string().optional(),
      phone: z.string().optional(),
      address_line1: z.string().optional(),
      address_line2: z.string().optional().nullable(),
      city: z.string().optional(),
      state: z.string().optional(),
      pincode: z.string().optional(),
      notes: z.string().optional(),
      order_source: z.string().optional(),
    })
    .passthrough()
    .optional(),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(["pending", "processing", "shipped", "delivered", "cancelled"]),
  notes: z.string().optional(),
});

export const createReviewSchema = z
  .object({
    productId: z.string().optional(),
    product_id: z.string().optional(),
    rating: z.coerce.number().int().min(1).max(5, "Rating must be between 1 and 5"),
    comment: z.string().nullable().optional(),
    damageDetails: z.string().nullable().optional(),
    damage_details: z.string().nullable().optional(),
  })
  .refine((data) => Boolean(data.productId || data.product_id), {
    message: "Product ID is required",
  });
