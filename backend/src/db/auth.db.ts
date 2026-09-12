import { db } from "../shared/config/firebase";
import { Profile, UserRole, UserType } from "../shared/types";
import { nowISTISO } from "../shared/utils/datetime";
import { v4 as uuidv4 } from "uuid";

export const IDENTITY_COLLECTIONS: Record<UserType, string> = {
  user: "users",
  admin: "admins",
};

export const identityCollection = (userType: UserType): string =>
  IDENTITY_COLLECTIONS[userType];

export const userTypeForRole = (role: UserRole | string): UserType =>
  role === "admin" || role === "super_admin" ? "admin" : "user";

export interface IdentityRef {
  profile: Profile;
  user_type: UserType;
  collection: string;
}

/**
 * Pure Database Operation: Look up account by ID across users & admins collections.
 */
export const findIdentityByIdDb = async (id: string): Promise<IdentityRef | null> => {
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
 * Pure Database Operation: Look up account by email across users & admins collections.
 */
export const findIdentityByEmailDb = async (email: string): Promise<IdentityRef | null> => {
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

/**
 * Pure Database Operation: Insert new identity profile into its collection.
 */
export const insertIdentityDb = async (
  profileOrData: any,
  userTypeInput?: UserType
): Promise<IdentityRef> => {
  const role = profileOrData.role || "user";
  const userType: UserType = userTypeInput || (role === "admin" || role === "super_admin" ? "admin" : "user");
  const coll = identityCollection(userType);
  const now = new Date().toISOString();
  const profile: Profile = {
    id: profileOrData.id || uuidv4(),
    full_name: profileOrData.full_name,
    email: profileOrData.email,
    password_hash: profileOrData.password_hash,
    phone: profileOrData.phone || null,
    role,
    avatar_url: profileOrData.avatar_url || null,
    is_active: profileOrData.is_active !== false,
    created_at: profileOrData.created_at || now,
    updated_at: profileOrData.updated_at || now,
    ...profileOrData,
  };
  await db.collection(coll).doc(profile.id).set(profile);
  return { profile, user_type: userType, collection: coll };
};

/**
 * Pure Database Operation: Update account in its collection.
 */
export const updateIdentityDb = async (
  id: string,
  userType: UserType,
  data: Partial<Profile>
): Promise<Profile | null> => {
  const updateData: Record<string, unknown> = {
    ...data,
    updated_at: nowISTISO(),
  };

  Object.keys(updateData).forEach(
    (key) => updateData[key] === undefined && delete updateData[key]
  );

  const ref = db.collection(identityCollection(userType)).doc(id);
  await ref.update(updateData);
  const doc = await ref.get();
  return doc.exists ? (doc.data() as Profile) : null;
};

/**
 * Pure Database Operation: Delete account from its collection.
 */
export const deleteIdentityDb = async (id: string, userType: UserType): Promise<void> => {
  await db.collection(identityCollection(userType)).doc(id).delete();
};

/**
 * Pure Database Operation: Update password hash.
 */
export const updatePasswordHashDb = async (
  userId: string,
  collection: string,
  password_hash: string
): Promise<void> => {
  await db.collection(collection).doc(userId).update({
    password_hash,
    updated_at: new Date().toISOString(),
  });
};

/**
 * Pure Database Operations for OTP verification store.
 */
export const getAdminOtpDb = async (email: string) => {
  const doc = await db.collection("admin_otps").doc(email).get();
  return doc.exists ? doc.data() : null;
};

export const setAdminOtpDb = async (email: string, otpData: Record<string, unknown>) => {
  await db.collection("admin_otps").doc(email).set(otpData);
};

export const deleteAdminOtpDb = async (email: string) => {
  await db.collection("admin_otps").doc(email).delete();
};
