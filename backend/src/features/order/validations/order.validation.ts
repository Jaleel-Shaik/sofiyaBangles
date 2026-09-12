import { z } from "zod";

export const createOrderSchema = z.object({
  items: z.array(z.object({
    product_id: z.string().uuid("Invalid product ID"),
    product_name: z.string().min(1, "Product name is required"),
    quantity: z.number().int().positive("Quantity must be positive"),
    price: z.number().nonnegative("Price cannot be negative"),
    size: z.string().optional(),
    image_url: z.string().url("Invalid image URL").nullable().optional(),
  })).min(1, "Order must contain at least one item"),
  shippingAddressSnapshot: z.object({
    full_name: z.string().min(1, "Full name is required"),
    address_line1: z.string().min(1, "Address is required"),
    address_line2: z.string().optional().nullable(),
    city: z.string().min(1, "City is required"),
    state: z.string().min(1, "State is required"),
    pincode: z.string().min(1, "Pincode is required"),
    phone: z.string().min(1, "Phone is required"),
  }).optional(),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(["pending", "processing", "shipped", "delivered", "cancelled"]),
});

export const createReviewSchema = z.object({
  productId: z.string().uuid("Invalid product ID"),
  rating: z.number().int().min(1).max(5, "Rating must be between 1 and 5"),
  comment: z.string().nullable().optional(),
  damageDetails: z.string().nullable().optional(),
});
