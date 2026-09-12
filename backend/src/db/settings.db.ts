import { db } from "../shared/config/firebase";
import { BusinessProfile } from "../shared/types";
import { env } from "../shared/config/env";

const SETTINGS_COLLECTION = "settings";
const BUSINESS_PROFILE_DOC = "business_profile";

export const DEFAULT_BUSINESS_PROFILE: BusinessProfile = {
  store_name: "Sofiya Bangles",
  description: "Founded with a passion for traditional craftsmanship and modern elegance, Sofiya Bangles has been a cornerstone for premium jewelry in the local community.",
  business_hours: "Mon-Sat: 10AM - 8PM, Sun: Closed",
  address: "123 Jewelry Market Road, City Center",
  whatsapp_number: env.WHATSAPP_NUMBER || "+919876543210",
  email: "support@sofiyabangles.com",
  phone_number: env.WHATSAPP_NUMBER || "+919876543210",
  updated_at: new Date().toISOString(),
};

/**
 * Pure Database Operation: Retrieve business profile document.
 */
export const getBusinessProfileDb = async (): Promise<BusinessProfile> => {
  const doc = await db.collection(SETTINGS_COLLECTION).doc(BUSINESS_PROFILE_DOC).get();
  if (!doc.exists) {
    return DEFAULT_BUSINESS_PROFILE;
  }
  return doc.data() as BusinessProfile;
};

/**
 * Pure Database Operation: Set or merge business profile document.
 */
export const updateBusinessProfileDb = async (
  data: Partial<BusinessProfile>
): Promise<BusinessProfile> => {
  const updateData = { ...data, updated_at: new Date().toISOString() };
  await db.collection(SETTINGS_COLLECTION).doc(BUSINESS_PROFILE_DOC).set(updateData, { merge: true });
  const doc = await db.collection(SETTINGS_COLLECTION).doc(BUSINESS_PROFILE_DOC).get();
  return doc.data() as BusinessProfile;
};
