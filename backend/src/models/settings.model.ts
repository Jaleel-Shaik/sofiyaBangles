import { BusinessProfile } from "../shared/types";
import { env } from "../shared/config/env";

export { BusinessProfile };

export const DEFAULT_BUSINESS_PROFILE: BusinessProfile = {
  store_name: "Sofiya Bangles",
  description: "Founded with a passion for traditional craftsmanship and modern elegance, Sofiya Bangles has been a cornerstone for premium jewelry in the local community.",
  business_hours: "Mon-Sat: 10AM - 8PM, Sun: Closed",
  address: "123 Jewelry Market Road, City Center",
  whatsapp_number: env.WHATSAPP_NUMBER || "+919876543210",
  email: "support@sofiyabangles.com",
  phone_number: env.WHATSAPP_NUMBER || "+919876543210",
  updated_at: new Date().toISOString()
};

export const BUSINESS_PROFILE_CONSTRAINTS = {
  MAX_STORE_NAME_LENGTH: 100,
  MAX_DESCRIPTION_LENGTH: 1000,
  MAX_ADDRESS_LENGTH: 500,
} as const;

export function validateBusinessProfile(profile: Partial<BusinessProfile>): { isValid: boolean; error?: string } {
  if (profile.store_name && profile.store_name.length > BUSINESS_PROFILE_CONSTRAINTS.MAX_STORE_NAME_LENGTH) {
    return { isValid: false, error: "Store name is too long" };
  }
  if (profile.description && profile.description.length > BUSINESS_PROFILE_CONSTRAINTS.MAX_DESCRIPTION_LENGTH) {
    return { isValid: false, error: "Description is too long" };
  }
  return { isValid: true };
}
