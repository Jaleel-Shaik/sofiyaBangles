"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateCategorySchema = exports.createCategorySchema = void 0;
const zod_1 = require("zod");
exports.createCategorySchema = zod_1.z.object({
    category_name: zod_1.z
        .string()
        .min(2, "Category name must be at least 2 characters")
        .max(100, "Category name must be under 100 characters")
        .trim(),
    image_url: zod_1.z.string().url("Invalid image URL").optional(),
    display_order: zod_1.z
        .union([zod_1.z.string(), zod_1.z.number()])
        .transform((val) => Number(val))
        .pipe(zod_1.z.number().int().min(0))
        .default(0),
});
exports.updateCategorySchema = exports.createCategorySchema.partial();
