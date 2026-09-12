import { db } from "../shared/config/firebase";
import { UserSizePreference } from "../shared/types";

/**
 * Pure Database Operation: Retrieve all size preferences for a user.
 */
export const getSizePreferencesDb = async (userId: string): Promise<UserSizePreference[]> => {
  const snapshot = await db
    .collection("size_preferences")
    .where("user_id", "==", userId)
    .get();

  return snapshot.docs.map((doc) => doc.data() as UserSizePreference);
};

/**
 * Pure Database Operation: Retrieve size preference document by ID.
 */
export const getSizePreferenceByIdDb = async (id: string): Promise<UserSizePreference | null> => {
  const doc = await db.collection("size_preferences").doc(id).get();
  if (!doc.exists) return null;
  return doc.data() as UserSizePreference;
};

/**
 * Pure Database Operation: Insert a size preference document.
 */
export const insertSizePreferenceDb = async (
  pref: UserSizePreference
): Promise<UserSizePreference> => {
  await db.collection("size_preferences").doc(pref.id).set(pref);
  return pref;
};

/**
 * Pure Database Operation: Update a size preference document.
 */
export const updateSizePreferenceDocDb = async (
  id: string,
  data: Partial<UserSizePreference>
): Promise<UserSizePreference> => {
  const updateData: Record<string, unknown> = {
    ...data,
    updated_at: new Date().toISOString(),
  };
  Object.keys(updateData).forEach((key) => updateData[key] === undefined && delete updateData[key]);

  await db.collection("size_preferences").doc(id).update(updateData);
  const doc = await db.collection("size_preferences").doc(id).get();
  return doc.data() as UserSizePreference;
};

/**
 * Pure Database Operation: Delete a size preference document.
 */
export const deleteSizePreferenceDocDb = async (id: string): Promise<void> => {
  await db.collection("size_preferences").doc(id).delete();
};
