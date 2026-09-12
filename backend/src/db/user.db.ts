import { db } from "../shared/config/firebase";
import { Profile } from "../shared/types";
import { identityCollection } from "./auth.db";

/**
 * Pure Database Operation: Retrieve paginated users from Firestore.
 */
export const queryUsersDb = async (options: {
  page?: number;
  limit?: number;
  role?: string;
  search?: string;
}): Promise<{ users: Omit<Profile, "password_hash">[]; total: number }> => {
  const collection = options.role === "admin" || options.role === "super_admin" ? "admins" : "users";
  const snapshot = await db.collection(collection).get();

  let allUsers = snapshot.docs
    .map((doc) => {
      const data = doc.data() as Profile;
      const { password_hash, ...safeData } = data;
      return safeData as Omit<Profile, "password_hash">;
    })
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  if (options.search) {
    const s = options.search.toLowerCase();
    allUsers = allUsers.filter(
      (u) =>
        (u.full_name && u.full_name.toLowerCase().includes(s)) ||
        (u.email && u.email.toLowerCase().includes(s))
    );
  }

  const total = allUsers.length;
  if (options.page && options.limit) {
    const offset = (options.page - 1) * options.limit;
    const paginatedUsers = allUsers.slice(offset, offset + options.limit);
    return { users: paginatedUsers, total };
  }

  return { users: allUsers, total };
};

/**
 * Pure Database Operation: Get user by ID checking both users and admins collections.
 */
export const getUserByIdDb = async (
  id: string
): Promise<Omit<Profile, "password_hash"> | null> => {
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

/**
 * Pure Database Operation: Update user role in Firestore, transferring collections if needed.
 */
export const updateUserRoleDb = async (
  id: string,
  role: string
): Promise<Omit<Profile, "password_hash">> => {
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

  const targetCollection = identityCollection(
    role === "admin" || role === "super_admin" ? "admin" : "user"
  );

  const updatedData: Profile = {
    ...data,
    role: role as Profile["role"],
    updated_at: new Date().toISOString(),
  };

  if (targetCollection !== currentCollection) {
    await db.collection(targetCollection).doc(id).set(updatedData);
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
