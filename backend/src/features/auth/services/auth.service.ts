import bcrypt from "bcryptjs";
import {
  findIdentityByEmailDb,
  findIdentityByIdDb,
  insertIdentityDb,
  updateIdentityDb,
} from "../../../db/auth.db";
import { generateToken } from "../../../shared/middlewares/auth.middleware";
import { RegisterInput, LoginInput } from "../validations/auth.validation";
import { insertAuditLogDb } from "../../../db/audit.db";

export const registerService = async (input: RegisterInput) => {
  // Check if email already exists
  const existing = await findIdentityByEmailDb(input.email);
  if (existing) {
    throw new Error("EMAIL_EXISTS");
  }

  // Hash password
  const salt = await bcrypt.genSalt(12);
  const password_hash = await bcrypt.hash(input.password, salt);

  // Create profile with the provided role (user or admin)
  // super_admin is NOT allowed via public registration - only seeded by backend
  const identity = await insertIdentityDb({
    full_name: input.full_name,
    email: input.email,
    password_hash,
    phone: input.phone,
    role: input.role || "user",
  });
  const profile = identity.profile;

  // Generate JWT
  const token = generateToken({
    userId: profile.id,
    email: profile.email,
    role: profile.role,
  });

  // Audit log
  await insertAuditLogDb({
    actor_id: profile.id,
    action: "USER_REGISTERED",
    table_name: profile.role === "admin" || profile.role === "super_admin" ? "admins" : "users",
    record_id: profile.id,
  });

  // Return without password hash
  const { password_hash: _, ...safeProfile } = profile;
  return { user: safeProfile, token };
};

export const loginService = async (input: LoginInput) => {
  // Find user
  const identity = await findIdentityByEmailDb(input.email);
  if (!identity) {
    throw new Error("INVALID_CREDENTIALS");
  }
  const profile = identity.profile;

  if (!profile.is_active) {
    throw new Error("ACCOUNT_DISABLED");
  }

  // Verify password
  if (!profile.password_hash) {
    throw new Error("INVALID_CREDENTIALS");
  }
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
  const identity = await findIdentityByIdDb(userId);
  if (!identity) {
    throw new Error("USER_NOT_FOUND");
  }
  return identity.profile;
};

export const updateProfileService = async (
  userId: string,
  data: { full_name?: string; phone?: string; avatar_url?: string; expo_push_token?: string },
) => {
  const identity = await findIdentityByIdDb(userId);
  if (!identity) throw new Error("USER_NOT_FOUND");

  const updated = await updateIdentityDb(userId, identity.user_type, data);
  if (!updated) throw new Error("USER_NOT_FOUND");

  const { password_hash, ...safeData } = updated;
  return safeData;
};
