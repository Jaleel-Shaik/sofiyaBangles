import bcrypt from "bcryptjs";
import {
  createProfileRepo,
  findProfileByEmailRepo,
  findProfileByIdRepo,
  updateProfileRepo,
} from "../repositories/auth.repository";
import { generateToken } from "../middlewares/auth.middleware";
import { RegisterInput, LoginInput } from "../validations/auth.schema";
import { createAuditLogRepo } from "../repositories/audit.repository";

export const registerService = async (input: RegisterInput) => {
  // Check if email already exists
  const existing = await findProfileByEmailRepo(input.email);
  if (existing) {
    throw new Error("EMAIL_EXISTS");
  }

  // Hash password
  const salt = await bcrypt.genSalt(12);
  const password_hash = await bcrypt.hash(input.password, salt);

  // Create profile
  const profile = await createProfileRepo({
    full_name: input.full_name,
    email: input.email,
    password_hash,
    phone: input.phone,
  });

  // Generate JWT
  const token = generateToken({
    userId: profile.id,
    email: profile.email,
    role: profile.role,
  });

  // Audit log
  await createAuditLogRepo({
    actor_id: profile.id,
    action: "USER_REGISTERED",
    table_name: "profiles",
    record_id: profile.id,
  });

  // Return without password hash
  const { password_hash: _, ...safeProfile } = profile;
  return { user: safeProfile, token };
};

export const loginService = async (input: LoginInput) => {
  // Find user
  const profile = await findProfileByEmailRepo(input.email);
  if (!profile) {
    throw new Error("INVALID_CREDENTIALS");
  }

  if (!profile.is_active) {
    throw new Error("ACCOUNT_DISABLED");
  }

  // Verify password
  const isValidPassword = await bcrypt.compare(
    input.password,
    profile.password_hash,
  );
  if (!isValidPassword) {
    throw new Error("INVALID_CREDENTIALS");
  }

  // Generate JWT
  const token = generateToken({
    userId: profile.id,
    email: profile.email,
    role: profile.role,
  });

  // Return without password hash
  const { password_hash: _, ...safeProfile } = profile;
  return { user: safeProfile, token };
};

export const getMeService = async (userId: string) => {
  const profile = await findProfileByIdRepo(userId);
  if (!profile) {
    throw new Error("USER_NOT_FOUND");
  }
  return profile;
};

export const updateProfileService = async (
  userId: string,
  data: { full_name?: string; phone?: string; avatar_url?: string; expo_push_token?: string },
) => {
  return updateProfileRepo(userId, data);
};
