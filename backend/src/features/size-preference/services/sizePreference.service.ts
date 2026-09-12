import {
  getSizePreferencesDb,
  getSizePreferenceByIdDb,
  insertSizePreferenceDb,
  updateSizePreferenceDocDb,
  deleteSizePreferenceDocDb,
} from "../../../db/sizePreference.db";
import { UserSizePreference, validateSizePreferenceInput } from "../../../models/sizePreference.model";
import { v4 as uuidv4 } from "uuid";

export const getSizePreferencesService = async (userId: string): Promise<UserSizePreference[]> => {
  return await getSizePreferencesDb(userId);
};

export const createSizePreferenceService = async (payload: {
  user_id: string;
  category_id: string;
  profile_name: string;
  is_custom: boolean;
  standard_size?: string;
  custom_measurements?: Record<string, number | string>;
}): Promise<UserSizePreference> => {
  const validation = validateSizePreferenceInput(payload);
  if (!validation.isValid) {
    throw new Error(validation.error || "INVALID_INPUT");
  }

  const newId = uuidv4();
  const prefData: UserSizePreference = {
    id: newId,
    user_id: payload.user_id,
    category_id: payload.category_id,
    profile_name: payload.profile_name,
    is_custom: payload.is_custom,
    standard_size: payload.standard_size,
    custom_measurements: payload.custom_measurements,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  return await insertSizePreferenceDb(prefData);
};

export const updateSizePreferenceService = async (
  id: string,
  userId: string,
  data: Partial<{
    profile_name: string;
    is_custom: boolean;
    standard_size: string;
    custom_measurements: Record<string, number | string>;
  }>
): Promise<UserSizePreference> => {
  const existing = await getSizePreferenceByIdDb(id);
  if (!existing) {
    throw new Error("SIZE_PREFERENCE_NOT_FOUND");
  }
  if (existing.user_id !== userId) {
    throw new Error("UNAUTHORIZED_ACCESS");
  }

  const updated = await updateSizePreferenceDocDb(id, data);
  if (!updated) {
    throw new Error("SIZE_PREFERENCE_NOT_FOUND");
  }
  return updated;
};

export const deleteSizePreferenceService = async (id: string, userId: string): Promise<void> => {
  const existing = await getSizePreferenceByIdDb(id);
  if (!existing) {
    throw new Error("SIZE_PREFERENCE_NOT_FOUND");
  }
  if (existing.user_id !== userId) {
    throw new Error("UNAUTHORIZED_ACCESS");
  }

  await deleteSizePreferenceDocDb(id);
};
