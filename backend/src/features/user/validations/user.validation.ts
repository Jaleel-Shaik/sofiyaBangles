import { z } from "zod";

export const updateUserRoleSchema = z.object({
  role: z.enum(["user", "admin", "super_admin"]),
});
