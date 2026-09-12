/**
 * Feature Model: Auth & Identity
 * Re-exports pure data models from src/models/auth.model
 * Re-exports database operations from src/db/auth.db for backward-compatible module resolution.
 */

export * from "../../../models/auth.model";
import {
  findIdentityByEmailDb,
  findIdentityByIdDb,
  insertIdentityDb,
  updateIdentityDb,
  updatePasswordHashDb,
  getAdminOtpDb,
  setAdminOtpDb,
  deleteAdminOtpDb,
} from "../../../db/auth.db";
import { Profile } from "../../../shared/types";

export const createProfileModel = async (data: {
  full_name: string;
  email: string;
  password_hash?: string;
  phone?: string;
  role?: string;
  avatar_url?: string;
}): Promise<Profile> => {
  const ref = await insertIdentityDb(data);
  return ref.profile;
};

export const findProfileByEmailModel = async (email: string): Promise<Profile | null> => {
  const identity = await findIdentityByEmailDb(email);
  return identity ? identity.profile : null;
};

export const findProfileByIdModel = async (id: string): Promise<Profile | null> => {
  const identity = await findIdentityByIdDb(id);
  return identity ? identity.profile : null;
};

export const findIdentityByEmail = findIdentityByEmailDb;
export const findIdentityById = findIdentityByIdDb;

export const updateProfileModel = async (
  id: string,
  data: Partial<Pick<Profile, "full_name" | "phone" | "avatar_url" | "expo_push_token">>,
): Promise<Profile> => {
  const identity = await findIdentityByIdDb(id);
  if (!identity) throw new Error("USER_NOT_FOUND");

  const updated = await updateIdentityDb(id, identity.user_type, data);
  if (!updated) throw new Error("USER_NOT_FOUND");

  const { password_hash, ...safeData } = updated;
  return safeData as Profile;
};

export {
  updatePasswordHashDb as updatePasswordHashModel,
  getAdminOtpDb as getAdminOtpModel,
  setAdminOtpDb as setAdminOtpModel,
  deleteAdminOtpDb as deleteAdminOtpModel,
};
