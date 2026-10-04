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
    orderId: z.string().nullable().optional(),
    order_id: z.string().nullable().optional(),
    orderItemId: z.string().nullable().optional(),
    order_item_id: z.string().nullable().optional(),
    rating: z.coerce.number().int().min(1).max(5, "Rating must be between 1 and 5"),
    qualityRating: z.coerce.number().int().min(1).max(5).optional(),
    quality_rating: z.coerce.number().int().min(1).max(5).optional(),
    comment: z.string().nullable().optional(),
    suggestion: z.string().nullable().optional(),
    isDefective: z.boolean().optional(),
    is_defective: z.boolean().optional(),
    damageDetails: z.string().nullable().optional(),
    damage_details: z.string().nullable().optional(),
    customerName: z.string().nullable().optional(),
    customer_name: z.string().nullable().optional(),
  })
  .refine((data) => Boolean(data.productId || data.product_id), {
    message: "Product ID is required",
  });

export const whatsappPurchaseSchema = z
  .object({
    productId: z.string().optional(),
    product_id: z.string().optional(),
    variantId: z.string().nullable().optional(),
    variant_id: z.string().nullable().optional(),
    quantity: z.coerce.number().int().positive("Quantity must be at least 1").default(1),
    size: z.string().nullable().optional(),
    customMeasurements: z.record(z.string(), z.string()).nullable().optional(),
    notes: z.string().max(500, "Notes cannot exceed 500 characters").nullable().optional(),
    customerName: z.string().optional(),
    customerPhone: z.string().optional(),
    phone: z.string().optional(),
  })
  .refine((data) => Boolean(data.productId || data.product_id), {
    message: "Product ID is required",
  });

