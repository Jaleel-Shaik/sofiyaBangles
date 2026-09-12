import { db } from "../../../shared/config/firebase";

export interface AdminRecord {
  id: string;
  full_name?: string;
  email?: string;
  phone?: string | null;
  role?: string;
  isActive?: boolean;
  is_active?: boolean;
  twoFactorEnabled?: boolean;
  is_2fa_enabled?: boolean;
  created_at?: string | null;
  updated_at?: string | null;
  [key: string]: unknown;
}

export const getAllAdminsModel = async (): Promise<AdminRecord[]> => {
  const snapshot = await db.collection("admins").get();
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as Record<string, unknown>),
  }));
};

export const getAdminByEmailModel = async (email: string): Promise<AdminRecord | null> => {
  const snapshot = await db.collection("admins").where("email", "==", email).limit(1).get();
  if (snapshot.empty) return null;
  const doc = snapshot.docs[0];
  return { id: doc.id, ...(doc.data() as Record<string, unknown>) };
};

export const getAdminByIdModel = async (id: string): Promise<AdminRecord | null> => {
  const doc = await db.collection("admins").doc(id).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...(doc.data() as Record<string, unknown>) };
};

export const createAdminModel = async (adminId: string, adminData: Record<string, unknown>): Promise<Record<string, unknown>> => {
  await db.collection("admins").doc(adminId).set(adminData);
  return adminData;
};

export const updateAdminModel = async (id: string, updateData: Record<string, unknown>): Promise<void> => {
  await db.collection("admins").doc(id).update(updateData);
};

export const deleteAdminModel = async (id: string): Promise<void> => {
  await db.collection("admins").doc(id).delete();
};
