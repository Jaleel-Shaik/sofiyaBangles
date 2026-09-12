import { db } from "../../../shared/config/firebase";

export const getAllAdminsModel = async () => {
  const snapshot = await db.collection("admins").get();
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
};

export const getAdminByEmailModel = async (email: string): Promise<any | null> => {
  const snapshot = await db.collection("admins").where("email", "==", email).limit(1).get();
  if (snapshot.empty) return null;
  const doc = snapshot.docs[0];
  return { id: doc.id, ...doc.data() };
};

export const getAdminByIdModel = async (id: string): Promise<any | null> => {
  const doc = await db.collection("admins").doc(id).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() };
};

export const createAdminModel = async (adminId: string, adminData: any) => {
  await db.collection("admins").doc(adminId).set(adminData);
  return adminData;
};

export const updateAdminModel = async (id: string, updateData: any) => {
  await db.collection("admins").doc(id).update(updateData);
};

export const deleteAdminModel = async (id: string) => {
  await db.collection("admins").doc(id).delete();
};
