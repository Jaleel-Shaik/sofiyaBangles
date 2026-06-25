import { db } from "../config/firebase";
import { Profile } from "../types";

export const getAllUsersModel = async (options: {
  page: number;
  limit: number;
  role?: string;
  search?: string;
}): Promise<{ users: Omit<Profile, "password_hash">[]; total: number }> => {
  const { page, limit, role, search } = options;
  let query: FirebaseFirestore.Query = db.collection("profiles");

  if (role) {
    query = query.where("role", "==", role);
  }

  // Firestore doesn't support native ILIKE search easily without external tools like Algolia.
  // We'll fetch all matching the role, then filter manually if search is present.
  // This is a naive implementation suitable for small to medium datasets.
  const snapshot = await query.orderBy("created_at", "desc").get();
  
  let allUsers = snapshot.docs.map(doc => {
    const data = doc.data() as Profile;
    const { password_hash, ...safeData } = data;
    return safeData as Omit<Profile, "password_hash">;
  });

  if (search) {
    const lowerSearch = search.toLowerCase();
    allUsers = allUsers.filter(u => 
      (u.full_name && u.full_name.toLowerCase().includes(lowerSearch)) || 
      (u.email && u.email.toLowerCase().includes(lowerSearch))
    );
  }

  const total = allUsers.length;
  const offset = (page - 1) * limit;
  const paginatedUsers = allUsers.slice(offset, offset + limit);

  return { users: paginatedUsers, total };
};

export const getUserByIdModel = async (
  id: string,
): Promise<Omit<Profile, "password_hash"> | null> => {
  const doc = await db.collection("profiles").doc(id).get();
  if (!doc.exists) return null;

  const data = doc.data() as Profile;
  const { password_hash, ...safeData } = data;
  return safeData;
};

export const updateUserRoleModel = async (
  id: string,
  role: string,
): Promise<Omit<Profile, "password_hash">> => {
  await db.collection("profiles").doc(id).update({
    role,
    updated_at: new Date().toISOString()
  });

  const doc = await db.collection("profiles").doc(id).get();
  const data = doc.data() as Profile;
  const { password_hash, ...safeData } = data;
  return safeData;
};
