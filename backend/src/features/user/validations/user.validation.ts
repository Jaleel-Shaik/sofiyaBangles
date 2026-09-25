import { z } from "zod";

export const updateUserRoleSchema = z.object({
  role: z.enum(["user", "admin", "super_admin"]),
});

export const createCustomerSchema = z.object({
  full_name: z.string().min(1, "Customer full name is required").trim(),
  phone: z.string().min(10, "A valid mobile number is required").trim(),
  email: z.string().email("Valid email address is required").trim(),
  password: z.string().min(6, "Password must be at least 6 characters").optional(),
});

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;

