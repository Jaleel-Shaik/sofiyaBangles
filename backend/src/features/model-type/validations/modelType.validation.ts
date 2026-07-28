import { z } from "zod";

export const createModelTypeSchema = z.object({
  name: z
    .string()
    .min(2, "Model type name must be at least 2 characters")
    .max(100, "Model type name must be under 100 characters")
    .trim(),
});

export const updateModelTypeSchema = createModelTypeSchema.partial();
