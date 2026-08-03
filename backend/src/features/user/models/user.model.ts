import { db } from "../../../shared/config/firebase";
import { Profile } from "../../../shared/types";
import { identityCollection } from "../../../shared/models/identity.model";

export const getAllUsersModel = async (options: {
  page: number;
  limit: number;
  role?: string;
  search?: string;
}): Promise<{ users: Omit<Profile, "password_hash">[]; total: number }> => {
  const { page, limit, role, search } = options;

  // Accounts are split: regular users live in "users", staff in "admins".
  const collection = role === "admin" || role === "super_admin" ? "admins" : "users";
  let query: FirebaseFirestore.Query = db.collection(collection);

  const snapshot = await query.get();

  let allUsers = snapshot.docs
    .map(doc => {
      const data = doc.data() as Profile;
      const { password_hash, ...safeData } = data;
      return safeData as Omit<Profile, "password_hash">;
    })
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

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
  // Check both collections since we don't know the type from the id alone
  for (const coll of ["users", "admins"]) {
    const doc = await db.collection(coll).doc(id).get();
    if (doc.exists) {
      const data = doc.data() as Profile;
      const { password_hash, ...safeData } = data;
      return safeData;
    }
  }
  return null;
};

export const updateUserRoleModel = async (
  id: string,
  role: string,
): Promise<Omit<Profile, "password_hash">> => {
  // Find the account in either collection
  let currentCollection: string | null = null;
  let data: Profile | null = null;
  for (const coll of ["users", "admins"]) {
    const doc = await db.collection(coll).doc(id).get();
    if (doc.exists) {
      currentCollection = coll;
      data = doc.data() as Profile;
      break;
    }
  }

  if (!currentCollection || !data) {
    throw new Error("USER_NOT_FOUND");
  }

  const newCollection = identityCollection(
    role === "admin" || role === "super_admin" ? "admin" : "user",
  );

  const updatedData: Profile = { ...data, role: role as Profile["role"], updated_at: new Date().toISOString() };

  // Role change may move the account between collections
  if (newCollection !== currentCollection) {
    await db.collection(newCollection).doc(id).set(updatedData);
    await db.collection(currentCollection).doc(id).delete();
  } else {
    await db.collection(currentCollection).doc(id).update({
      role,
      updated_at: new Date().toISOString(),
    });
  }

  const { password_hash, ...safeData } = updatedData;
  return safeData;
};
