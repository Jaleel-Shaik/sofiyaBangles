import { db } from "../config/firebase";
import { Profile, UserRole, UserType } from "../types";
import { v4 as uuidv4 } from "uuid";
import { nowISTISO } from "../utils/datetime";

/**
 * The app splits accounts across two collections instead of keeping
 * everyone in a single "profiles" table:
 *
 *   - "users"  → regular customers (role === "user")
 *   - "admins" → staff accounts (role === "admin" | "super_admin")
 *
 * This model is the ONLY place that decides which collection an account
 * lives in, so every other feature reads/writes accounts through it.
 */
export const IDENTITY_COLLECTIONS: Record<UserType, string> = {
  user: "users",
  admin: "admins",
};

export const identityCollection = (userType: UserType): string =>
  IDENTITY_COLLECTIONS[userType];

/** Maps a role to the collection it belongs to. */
export const userTypeForRole = (role: UserRole | string): UserType =>
  role === "admin" || role === "super_admin" ? "admin" : "user";

export interface IdentityRef {
  profile: Profile;
  user_type: UserType;
  collection: string;
}

/**
 * Looks up an account by id in BOTH collections (users + admins).
 * Returns the account together with which collection it was found in.
 */
export const findIdentityByIdModel = async (
  id: string,
): Promise<IdentityRef | null> => {
  for (const userType of ["user", "admin"] as UserType[]) {
    const doc = await db.collection(identityCollection(userType)).doc(id).get();
    if (doc.exists) {
      return {
        profile: doc.data() as Profile,
        user_type: userType,
        collection: identityCollection(userType),
      };
    }
  }
  return null;
};

/**
 * Looks up an account by email in BOTH collections.
 * Admins are checked first (fewer records, faster hit for staff logins).
 */
export const findIdentityByEmailModel = async (
  email: string,
): Promise<IdentityRef | null> => {
  for (const userType of ["admin", "user"] as UserType[]) {
    const snapshot = await db
      .collection(identityCollection(userType))
      .where("email", "==", email)
      .limit(1)
      .get();
    if (!snapshot.empty) {
      const doc = snapshot.docs[0];
      return {
        profile: doc.data() as Profile,
        user_type: userType,
        collection: identityCollection(userType),
      };
    }
  }
  return null;
};

export const findUserByIdModel = async (
  id: string,
): Promise<Profile | null> => {
  const doc = await db.collection(identityCollection("user")).doc(id).get();
  return doc.exists ? (doc.data() as Profile) : null;
};

export const findAdminByIdModel = async (
  id: string,
): Promise<Profile | null> => {
  const doc = await db.collection(identityCollection("admin")).doc(id).get();
  return doc.exists ? (doc.data() as Profile) : null;
};

/**
 * Creates a new account in the correct collection based on its role.
 * Returns the created profile together with the collection used.
 */
export const createIdentityModel = async (data: {
  full_name: string;
  email: string;
  password_hash?: string;
  phone?: string;
  role?: string;
  avatar_url?: string;
  expo_push_token?: string;
  is_active?: boolean;
  is_2fa_enabled?: boolean;
  two_fa_secret?: string | null;
}): Promise<IdentityRef> => {
  const newId = uuidv4();
  const userType = userTypeForRole(data.role || "user");
  const profileData: Profile = {
    id: newId,
    full_name: data.full_name,
    email: data.email,
    password_hash: data.password_hash || "",
    phone: data.phone || null,
    role: (data.role as UserRole) || "user",
    avatar_url: data.avatar_url || null,
    expo_push_token: data.expo_push_token || null,
    is_active: data.is_active ?? true,
    is_2fa_enabled: data.is_2fa_enabled ?? false,
    two_fa_secret: data.two_fa_secret ?? null,
    created_at: nowISTISO(),
    updated_at: nowISTISO(),
  };

  await db.collection(identityCollection(userType)).doc(newId).set(profileData);
  return { profile: profileData, user_type: userType, collection: identityCollection(userType) };
};

/** Updates an account inside its own collection. */
export const updateIdentityModel = async (
  id: string,
  userType: UserType,
  data: Partial<
    Pick<
      Profile,
      | "full_name"
      | "phone"
      | "avatar_url"
      | "expo_push_token"
      | "password_hash"
      | "is_active"
      | "is_2fa_enabled"
      | "two_fa_secret"
      | "role"
    >
  >,
): Promise<Profile | null> => {
  const updateData: Record<string, unknown> = {
    ...data,
    updated_at: nowISTISO(),
  };
  Object.keys(updateData).forEach(
    (key) => updateData[key] === undefined && delete updateData[key],
  );

  const ref = db.collection(identityCollection(userType)).doc(id);
  await ref.update(updateData);

  const doc = await ref.get();
  return doc.exists ? (doc.data() as Profile) : null;
};

/** Returns the display name for an account id (used by audit log viewers). */
export const getIdentityNameModel = async (
  id: string,
): Promise<string | undefined> => {
  const identity = await findIdentityByIdModel(id);
  return identity?.profile.full_name;
};

/** Deletes an account permanently from its collection. */
export const deleteIdentityModel = async (
  id: string,
  userType: UserType,
): Promise<void> => {
  await db.collection(identityCollection(userType)).doc(id).delete();
};

/** Moves an account between collections (e.g. user promoted to admin). */
export const moveIdentityToModel = async (
  id: string,
  fromUserType: UserType,
  toUserType: UserType,
): Promise<void> => {
  const identity = await findIdentityByIdModel(id);
  if (!identity || identity.user_type !== fromUserType) return;

  await db
    .collection(identityCollection(toUserType))
    .doc(id)
    .set(identity.profile, { merge: true });
  await db.collection(identityCollection(fromUserType)).doc(id).delete();
};
