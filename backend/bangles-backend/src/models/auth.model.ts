import { db } from "../config/firebase";
import { Profile } from "../types";
import { v4 as uuidv4 } from 'uuid';

export const createProfileModel = async (data: {
  full_name: string;
  email: string;
  password_hash: string;
  phone?: string;
  role?: string;
  avatar_url?: string;
}): Promise<Profile> => {
  const newId = uuidv4();
  const profileData: Profile = {
    id: newId,
    full_name: data.full_name,
    email: data.email,
    password_hash: data.password_hash,
    phone: data.phone || null,
    role: (data.role as "admin" | "user") || "user",
    avatar_url: data.avatar_url || null,
    expo_push_token: null,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  await db.collection("profiles").doc(newId).set(profileData);
  return profileData;
};

export const findProfileByEmailModel = async (
  email: string,
): Promise<Profile | null> => {
  const snapshot = await db.collection("profiles").where("email", "==", email).limit(1).get();
  if (snapshot.empty) return null;
  return snapshot.docs[0].data() as Profile;
};

export const findProfileByIdModel = async (
  id: string,
): Promise<Profile | null> => {
  const doc = await db.collection("profiles").doc(id).get();
  if (!doc.exists) return null;
  
  const data = doc.data() as Profile;
  return data;
};

export const updateProfileModel = async (
  id: string,
  data: Partial<Pick<Profile, "full_name" | "phone" | "avatar_url" | "expo_push_token">>,
): Promise<Profile> => {
  const updateData: any = { ...data, updated_at: new Date().toISOString() };
  // Remove undefined fields
  Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);

  await db.collection("profiles").doc(id).update(updateData);
  
  const updatedDoc = await db.collection("profiles").doc(id).get();
  const docData = updatedDoc.data() as Profile;
  const { password_hash, ...safeData } = docData;
  return safeData as Profile;
};
