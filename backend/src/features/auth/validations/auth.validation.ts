import { z } from "zod";

export const registerSchema = z.object({
  full_name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be under 100 characters")
    .trim(),
  email: z
    .string()
    .email("Please enter a valid email address")
    .trim()
    .toLowerCase(),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .max(128, "Password must be under 128 characters"),
  phone: z.string().optional(),
  role: z.enum(["user", "admin"]).optional().default("user"),
});

export const loginSchema = z.object({
  email: z
    .string()
    .email("Please enter a valid email address")
    .trim()
    .toLowerCase(),
  password: z.string().min(1, "Password is required"),
});

export const verify2faSchema = z.object({
  otp_pending_token: z.string().optional(),
  challenge_id: z.string().optional(),
  challengeId: z.string().optional(),
  email: z.string().optional(),
  otp_code: z.string().optional(),
  otp: z.string().optional(),
  useBackupCode: z.boolean().optional(),
  use_backup_code: z.boolean().optional(),
}).refine(
  (data) => Boolean(data.otp_pending_token || data.challenge_id || data.challengeId),
  { message: "Either challengeId, challenge_id, or otp_pending_token is required" }
).refine(
  (data) => Boolean((data.otp && data.otp.trim().length > 0) || (data.otp_code && data.otp_code.trim().length > 0)),
  { message: "OTP or backup recovery code is required" }
);

export const refreshTokenSchema = z.object({
  refresh_token: z.string().min(1, "Refresh token is required"),
});

export const regenerateQRSchema = z.object({
  otp_pending_token: z.string().min(1, "OTP pending token is required"),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type Verify2faInput = z.infer<typeof verify2faSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;

