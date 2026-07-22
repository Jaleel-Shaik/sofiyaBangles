import { db } from "../../../shared/config/firebase";
import { UserSizePreference } from "../../../shared/types";
import { v4 as uuidv4 } from 'uuid';

export const getSizePreferencesModel = async (userId: string): Promise<UserSizePreference[]> => {
  const snapshot = await db.collection("size_preferences")
    .where("user_id", "==", userId)
    .get();
  
  return snapshot.docs.map(doc => doc.data() as UserSizePreference);
};

export const createSizePreferenceModel = async (payload: {
  user_id: string;
  category_id: string;
  profile_name: string;
  is_custom: boolean;
  standard_size?: string;
  custom_measurements?: Record<string, number | string>;
}): Promise<UserSizePreference> => {
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
    updated_at: new Date().toISOString()
  };

  await db.collection("size_preferences").doc(newId).set(prefData);
  return prefData;
};

export const updateSizePreferenceModel = async (
  id: string,
  userId: string,
  data: Partial<{
    profile_name: string;
    is_custom: boolean;
    standard_size: string;
    custom_measurements: Record<string, number | string>;
  }>,
): Promise<UserSizePreference> => {
  const docRef = db.collection("size_preferences").doc(id);
  const doc = await docRef.get();
  if (!doc.exists) {
    throw new Error("SIZE_PREFERENCE_NOT_FOUND");
  }
  if (doc.data()?.user_id !== userId) {
    throw new Error("UNAUTHORIZED_ACCESS");
  }

  const updateData: any = { ...data, updated_at: new Date().toISOString() };
  Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);

  await docRef.update(updateData);
  
  const updatedDoc = await docRef.get();
  return updatedDoc.data() as UserSizePreference;
};

export const deleteSizePreferenceModel = async (id: string, userId: string): Promise<void> => {
  const docRef = db.collection("size_preferences").doc(id);
  const doc = await docRef.get();
  if (!doc.exists) {
    throw new Error("SIZE_PREFERENCE_NOT_FOUND");
  }
  if (doc.data()?.user_id !== userId) {
    throw new Error("UNAUTHORIZED_ACCESS");
  }

  await docRef.delete();
};
