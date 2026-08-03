import { Profile } from "../../../shared/types";
import {
  createIdentityModel,
  findIdentityByEmailModel,
  findIdentityByIdModel,
  updateIdentityModel,
  IdentityRef,
} from "../../../shared/models/identity.model";

/**
 * Account storage is split across "users" and "admins" collections.
 * All CRUD goes through the shared identity model so the split stays
 * consistent everywhere.
 */
export const createProfileModel = async (data: {
  full_name: string;
  email: string;
  password_hash?: string;
  phone?: string;
  role?: string;
  avatar_url?: string;
}): Promise<Profile> => {
  const ref = await createIdentityModel(data);
  return ref.profile;
};

export const findProfileByEmailModel = async (
  email: string,
): Promise<Profile | null> => {
  const identity = await findIdentityByEmailModel(email);
  return identity ? identity.profile : null;
};

export const findProfileByIdModel = async (
  id: string,
): Promise<Profile | null> => {
  const identity = await findIdentityByIdModel(id);
  return identity ? identity.profile : null;
};

export const findIdentityByEmail = findIdentityByEmailModel;
export const findIdentityById = findIdentityByIdModel;

export const updateProfileModel = async (
  id: string,
  data: Partial<Pick<Profile, "full_name" | "phone" | "avatar_url" | "expo_push_token">>,
): Promise<Profile> => {
  const identity = await findIdentityByIdModel(id);
  if (!identity) throw new Error("USER_NOT_FOUND");

  const updated = await updateIdentityModel(id, identity.user_type, data);
  if (!updated) throw new Error("USER_NOT_FOUND");

  const { password_hash, ...safeData } = updated;
  return safeData as Profile;
};
