"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateStockSchema = exports.updateProductSchema = exports.createProductSchema = void 0;
const zod_1 = require("zod");
exports.createProductSchema = zod_1.z.object({
    product_name: zod_1.z
        .string()
        .min(2, "Product name must be at least 2 characters")
        .max(200, "Product name must be under 200 characters")
        .trim(),
    description: zod_1.z
        .string()
        .max(2000, "Description must be under 2000 characters")
        .optional(),
    price: zod_1.z
        .union([zod_1.z.string(), zod_1.z.number()])
        .transform((val) => Number(val))
        .pipe(zod_1.z.number().positive("Price must be a positive number").max(9999999, "Price is too high")),
    quantity: zod_1.z
        .union([zod_1.z.string(), zod_1.z.number()])
        .transform((val) => Number(val))
        .pipe(zod_1.z.number().int("Quantity must be a whole number").min(0, "Quantity cannot be negative"))
        .default(0),
    category_id: zod_1.z.string().uuid("Invalid category ID").optional(),
});
exports.updateProductSchema = exports.createProductSchema.partial();
exports.updateStockSchema = zod_1.z.object({
    quantity: zod_1.z
        .union([zod_1.z.string(), zod_1.z.number()])
        .transform((val) => Number(val))
        .pipe(zod_1.z.number().int("Quantity must be a whole number").min(0, "Quantity cannot be negative")),
});
