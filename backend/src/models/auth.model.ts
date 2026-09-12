import { Profile, UserRole, UserType } from "../shared/types";

export interface IdentityRef {
  profile: Profile;
  user_type: UserType;
  collection: string;
}

export interface AuthTokenPayload {
  userId: string;
  email: string;
  role: UserRole;
  userType?: UserType;
}

export const AUTH_CONSTRAINTS = {
  MIN_PASSWORD_LENGTH: 6,
  MAX_EMAIL_LENGTH: 254,
  MAX_NAME_LENGTH: 100,
} as const;
