"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loginSchema = exports.registerSchema = void 0;
const zod_1 = require("zod");
exports.registerSchema = zod_1.z.object({
    full_name: zod_1.z
        .string()
        .min(2, "Name must be at least 2 characters")
        .max(100, "Name must be under 100 characters")
        .trim(),
    email: zod_1.z
        .string()
        .email("Please enter a valid email address")
        .trim()
        .toLowerCase(),
    password: zod_1.z
        .string()
        .min(6, "Password must be at least 6 characters")
        .max(128, "Password must be under 128 characters"),
    phone: zod_1.z.string().optional(),
});
exports.loginSchema = zod_1.z.object({
    email: zod_1.z
        .string()
        .email("Please enter a valid email address")
        .trim()
        .toLowerCase(),
    password: zod_1.z.string().min(1, "Password is required"),
});
