import { db } from "../shared/config/firebase";
import { AdminRecord } from "../models/adminStaff.model";

/**
 * Pure Database Operation: Retrieve all admin documents from "admins" collection.
 */
export const getAllAdminsDb = async (): Promise<AdminRecord[]> => {
  const snapshot = await db.collection("admins").get();
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as Record<string, unknown>),
  }));
};

/**
 * Pure Database Operation: Find admin by email.
 */
export const getAdminByEmailDb = async (email: string): Promise<AdminRecord | null> => {
  const snapshot = await db.collection("admins").where("email", "==", email).limit(1).get();
  if (snapshot.empty) return null;
  const doc = snapshot.docs[0];
  return { id: doc.id, ...(doc.data() as Record<string, unknown>) };
};

/**
 * Pure Database Operation: Find admin by ID.
 */
export const getAdminByIdDb = async (id: string): Promise<AdminRecord | null> => {
  const doc = await db.collection("admins").doc(id).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...(doc.data() as Record<string, unknown>) };
};

/**
 * Pure Database Operation: Insert new admin document.
 */
export const insertAdminDb = async (
  adminId: string,
  adminData: Record<string, unknown>
): Promise<Record<string, unknown>> => {
  await db.collection("admins").doc(adminId).set(adminData);
  return adminData;
};

/**
 * Pure Database Operation: Update admin document.
 */
export const updateAdminDb = async (
  id: string,
  updateData: Record<string, unknown>
): Promise<void> => {
  await db.collection("admins").doc(id).update(updateData);
};

/**
 * Pure Database Operation: Delete admin document.
 */
export const deleteAdminDb = async (id: string): Promise<void> => {
  await db.collection("admins").doc(id).delete();
};
