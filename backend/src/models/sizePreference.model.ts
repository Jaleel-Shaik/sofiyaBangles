import { UserSizePreference } from "../shared/types";

export { UserSizePreference };

export const STANDARD_BANGLES_SIZES = [
  "2-2",
  "2-4",
  "2-6",
  "2-8",
  "2-10",
  "Free Size",
] as const;

export const SIZE_PREFERENCE_CONSTRAINTS = {
  MAX_PROFILE_NAME_LENGTH: 50,
  ALLOWED_STANDARD_SIZES: STANDARD_BANGLES_SIZES,
} as const;

export function validateSizePreferenceInput(payload: {
  category_id?: string;
  profile_name?: string;
  is_custom?: boolean;
  standard_size?: string;
}): { isValid: boolean; error?: string } {
  if (!payload.category_id) {
    return { isValid: false, error: "category_id is required" };
  }
  if (!payload.profile_name || payload.profile_name.trim().length === 0) {
    return { isValid: false, error: "profile_name is required" };
  }
  if (payload.profile_name.length > SIZE_PREFERENCE_CONSTRAINTS.MAX_PROFILE_NAME_LENGTH) {
    return { isValid: false, error: "profile_name exceeds maximum length" };
  }
  if (!payload.is_custom && payload.standard_size) {
    if (!STANDARD_BANGLES_SIZES.includes(payload.standard_size as any)) {
      return { isValid: false, error: `Invalid standard_size. Must be one of: ${STANDARD_BANGLES_SIZES.join(", ")}` };
    }
  }
  return { isValid: true };
}
