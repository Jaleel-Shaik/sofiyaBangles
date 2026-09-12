import { API_ENDPOINTS } from "./endpoints";
import { apiClient } from "./client";
import { LoginResponse, Verify2FAResponse, RefreshTokenResponse, User, Session } from "./types";

export const authApi = {
  login: (email: string, password: string) =>
    apiClient.post<{ success: boolean; data: LoginResponse }>(API_ENDPOINTS.AUTH.LOGIN, { email, password }).then((r) => r.data.data),

  verify2FA: (
    payloadOrToken:
      | {
          challengeId?: string;
          challenge_id?: string;
          email?: string;
          otp?: string;
          otp_code?: string;
          otp_pending_token?: string;
          useBackupCode?: boolean;
          use_backup_code?: boolean;
        }
      | string,
    legacyOtpCode?: string
  ) => {
    const payload =
      typeof payloadOrToken === "string"
        ? { otp_pending_token: payloadOrToken, otp_code: legacyOtpCode }
        : payloadOrToken;

    return apiClient
      .post<{ success: boolean; data: Verify2FAResponse }>(API_ENDPOINTS.AUTH.VERIFY_2FA, payload)
      .then((r) => r.data.data);
  },

  refreshToken: (refreshToken: string) =>
    apiClient
      .post<{ success: boolean; data: RefreshTokenResponse }>(API_ENDPOINTS.AUTH.REFRESH_TOKEN, {
        refresh_token: refreshToken,
      })
      .then((r) => r.data.data),

  getMe: () => apiClient.get<{ data: User }>(API_ENDPOINTS.AUTH.ME).then((r) => r.data.data),

  logout: (refreshToken: string, sessionId?: string) =>
    apiClient.post(API_ENDPOINTS.AUTH.LOGOUT, {
      refresh_token: refreshToken,
      session_id: sessionId,
    }),

  getSessions: () =>
    apiClient.get<{ data: Session[] }>(API_ENDPOINTS.AUTH.SESSIONS).then((r) => r.data.data),

  regenerateQR: (otpPendingToken: string) =>
    apiClient
      .post<{ success: boolean; data: { qr_code_url: string; secret: string; otp_pending_token: string } }>(
        API_ENDPOINTS.AUTH.REGENERATE_QR,
        { otp_pending_token: otpPendingToken }
      )
      .then((r) => r.data.data),

  disable2FA: (password: string) =>
    apiClient.post(API_ENDPOINTS.AUTH.DISABLE_2FA, { password }),

  uploadAvatar: (file: File) => {
    const formData = new FormData();
    formData.append("avatar", file);
    return apiClient
      .post<{ success: boolean; data: User; message: string }>(API_ENDPOINTS.AUTH.AVATAR, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((r) => r.data.data);
  },

  updateProfile: (data: { full_name?: string; phone?: string }) =>
    apiClient.put<{ success: boolean; data: User; message: string }>("/auth/me", data).then((r) => r.data.data),
};
