import { apiClient } from "./client";
import { LoginResponse, Verify2FAResponse, RefreshTokenResponse, User, Session } from "./types";

export const authApi = {
  login: (email: string, password: string) =>
    apiClient.post<{ success: boolean; data: LoginResponse }>("/auth/login", { email, password }).then((r) => r.data.data),

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
      .post<{ success: boolean; data: Verify2FAResponse }>("/auth/verify-2fa", payload)
      .then((r) => r.data.data);
  },

  refreshToken: (refreshToken: string) =>
    apiClient
      .post<{ success: boolean; data: RefreshTokenResponse }>("/auth/refresh-token", {
        refresh_token: refreshToken,
      })
      .then((r) => r.data.data),

  getMe: () => apiClient.get<{ data: User }>("/auth/me").then((r) => r.data.data),

  logout: (refreshToken: string, sessionId?: string) =>
    apiClient.post("/auth/logout", {
      refresh_token: refreshToken,
      session_id: sessionId,
    }),

  getSessions: () =>
    apiClient.get<{ data: Session[] }>("/auth/sessions").then((r) => r.data.data),

  regenerateQR: (otpPendingToken: string) =>
    apiClient
      .post<{ success: boolean; data: { qr_code_url: string; secret: string; otp_pending_token: string } }>(
        "/auth/regenerate-qr",
        { otp_pending_token: otpPendingToken }
      )
      .then((r) => r.data.data),

  disable2FA: (password: string) =>
    apiClient.post("/auth/disable-2fa", { password }),

  uploadAvatar: (file: File) => {
    const formData = new FormData();
    formData.append("avatar", file);
    return apiClient
      .post<{ success: boolean; data: User; message: string }>("/auth/me/avatar", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((r) => r.data.data);
  },

  updateProfile: (data: { full_name?: string; phone?: string }) =>
    apiClient.put<{ success: boolean; data: User; message: string }>("/auth/me", data).then((r) => r.data.data),
};
