"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import {
  api,
  type User,
  type LoginResponse,
  type Verify2FAResponse,
} from "@/src/lib/api";
import { sessionManager, type SessionEndReason } from "./session-manager";
import toast from "react-hot-toast";

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshTokenValue: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  is2FAPending: boolean;
  otpPendingToken: string | null;
  challengeId: string | null;
  expiresAt: string | null;
  email: string | null;
  setupRequired: boolean;
  qrCodeUrl: string | null;
  manualSecret: string | null;
  loginStep: "idle" | "password_verified" | "2fa_verified" | "complete";
  accessDenied: boolean;
  accessDeniedMessage: string | null;
  backupCodes: string[] | null;
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<LoginResponse>;
  verify2FA: (otpCode: string, useBackupCode?: boolean) => Promise<Verify2FAResponse>;
  verifyFirstOTP: (otpCode: string) => Promise<Verify2FAResponse>;
  completeAuthentication: (authData: Verify2FAResponse) => void;
  regenerateQR: () => Promise<{ qr_code_url: string; secret: string; otp_pending_token: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  getSessions: () => Promise<any[]>;
  clearAccessDenied: () => void;
  clear2FAPending: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    accessToken: null,
    refreshTokenValue: null,
    isAuthenticated: false,
    isLoading: true,
    is2FAPending: false,
    otpPendingToken: null,
    challengeId: null,
    expiresAt: null,
    email: null,
    setupRequired: false,
    qrCodeUrl: null,
    manualSecret: null,
    loginStep: "idle",
    accessDenied: false,
    accessDeniedMessage: null,
    backupCodes: null,
  });

  // Load persisted auth state on mount
  useEffect(() => {
    if (typeof window === "undefined") {
      setState((prev) => ({ ...prev, isLoading: false }));
      return;
    }

    const accessToken = localStorage.getItem("access_token");
    const refreshTokenValue = localStorage.getItem("refresh_token");
    const userJson = localStorage.getItem("user");

    if (accessToken && refreshTokenValue && userJson) {
      try {
        const user = JSON.parse(userJson) as User;
        
        // Enforce web authorization: regular users cannot log into the web portal
        if (user.role === "user") {
          throw new Error("This account does not have access to the web portal.");
        }

        setState((prev) => ({
          ...prev,
          user,
          accessToken,
          refreshTokenValue,
          isAuthenticated: true,
          loginStep: "complete",
          isLoading: false,
        }));
        return;
      } catch (err) {
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        localStorage.removeItem("user");
      }
    }

    // Check for pending 2FA challenge in sessionStorage (persisted across browser refresh)
    const sessionChallenge = sessionStorage.getItem("2fa_challenge_id");
    const sessionExpiresAt = sessionStorage.getItem("2fa_expires_at");
    const sessionEmail = sessionStorage.getItem("2fa_email");
    const sessionSetupState = sessionStorage.getItem("2fa_setup_state");
    const sessionQrUrl = sessionStorage.getItem("2fa_qr_code_url");

    if (sessionChallenge && sessionExpiresAt) {
      if (new Date() >= new Date(sessionExpiresAt)) {
        // Expired
        sessionStorage.removeItem("2fa_challenge_id");
        sessionStorage.removeItem("2fa_expires_at");
        sessionStorage.removeItem("2fa_email");
        sessionStorage.removeItem("2fa_setup_state");
        sessionStorage.removeItem("2fa_qr_code_url");
        toast.error("Setup session expired. Please log in again.");
        setState((prev) => ({ ...prev, isLoading: false }));
      } else {
        // Active challenge restored from sessionStorage
        setState((prev) => ({
          ...prev,
          is2FAPending: true,
          challengeId: sessionChallenge,
          expiresAt: sessionExpiresAt,
          email: sessionEmail,
          qrCodeUrl: sessionQrUrl,
          setupRequired: sessionSetupState === "setup_required",
          loginStep: "password_verified",
          isLoading: false,
        }));
      }
    } else {
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  }, []);

  // Session manager: auto-logout on browser close
  useEffect(() => {
    if (typeof window === "undefined" || !state.isAuthenticated) return;

    const unsub = sessionManager.onEnd(async (reason: SessionEndReason) => {
      // Only handle non-close reasons (token expiry, session timeout)
      if (reason !== "browser_close" && reason !== "tab_close") {
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        localStorage.removeItem("user");
        sessionManager.clearEndReason();
      }
    });

    sessionManager.start();

    return () => {
      unsub();
      sessionManager.stop();
    };
  }, [state.isAuthenticated]);

  // Restore session from previous tab close
  useEffect(() => {
    if (typeof window === "undefined") return;
    const endReason = sessionManager.getEndReason();
    if (endReason && state.isAuthenticated) {
      sessionManager.clearEndReason();
      performLogout();
    }
  }, [state.isAuthenticated]);

  const clearAccessDenied = useCallback(() => {
    setState((prev) => ({
      ...prev,
      accessDenied: false,
      accessDeniedMessage: null,
    }));
  }, []);

  const clear2FAPending = useCallback(() => {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("2fa_challenge_id");
      sessionStorage.removeItem("2fa_expires_at");
      sessionStorage.removeItem("2fa_email");
      sessionStorage.removeItem("2fa_setup_state");
      sessionStorage.removeItem("2fa_qr_code_url");
    }
    setState((prev) => ({
      ...prev,
      is2FAPending: false,
      challengeId: null,
      expiresAt: null,
      email: null,
      otpPendingToken: null,
      setupRequired: false,
      qrCodeUrl: null,
      manualSecret: null,
      loginStep: "idle",
      backupCodes: null,
    }));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    // Clear any stale session-ended flags from a previous session
    sessionManager.clearEndReason();
    setState((prev) => ({ ...prev, isLoading: true, accessDenied: false, accessDeniedMessage: null }));

    try {
      const result = await api.auth.login(email, password);

      const isSetup = Boolean(result.isTotpSetupRequired ?? result.setup_required);
      const isOtp = Boolean(result.requiresOtp ?? result.require_otp ?? result.otp_pending_token);
      const challengeId = result.challengeId || result.challenge_id || null;
      const expiresAt = result.expiresAt || result.expires_at || null;

      if (isSetup) {
        // First login: 2FA setup required (persist ONLY challengeId, expiresAt, and setup state in sessionStorage)
        if (typeof window !== "undefined") {
          sessionStorage.setItem("2fa_challenge_id", challengeId || "");
          sessionStorage.setItem("2fa_expires_at", expiresAt || "");
          sessionStorage.setItem("2fa_email", email);
          sessionStorage.setItem("2fa_qr_code_url", result.qrCodeUrl || result.qr_code_url || "");
          sessionStorage.setItem("2fa_setup_state", "setup_required");
        }

        setState((prev) => ({
          ...prev,
          is2FAPending: true,
          challengeId,
          expiresAt,
          email,
          otpPendingToken: result.otp_pending_token || null,
          setupRequired: true,
          qrCodeUrl: result.qrCodeUrl || result.qr_code_url || null,
          manualSecret: result.secret || null,
          loginStep: "password_verified",
          isLoading: false,
        }));
      } else if (isOtp) {
        // Subsequent login: OTP verification required
        if (typeof window !== "undefined") {
          sessionStorage.setItem("2fa_challenge_id", challengeId || "");
          sessionStorage.setItem("2fa_expires_at", expiresAt || "");
          sessionStorage.setItem("2fa_email", email);
          sessionStorage.setItem("2fa_setup_state", "otp_pending");
        }

        setState((prev) => ({
          ...prev,
          is2FAPending: true,
          challengeId,
          expiresAt,
          email,
          otpPendingToken: result.otp_pending_token || null,
          setupRequired: false,
          qrCodeUrl: null,
          manualSecret: null,
          loginStep: "password_verified",
          isLoading: false,
        }));
      } else if (result.access_token && result.user) {
        // Direct token response (regular users without 2FA bypass)
        if (result.user.role === "user") {
          throw new Error("PLATFORM_ACCESS_DENIED_USER_WEB");
        }

        localStorage.setItem("access_token", result.access_token);
        localStorage.setItem("refresh_token", result.refresh_token || "");
        localStorage.setItem("user", JSON.stringify(result.user));
        if (result.session_id) localStorage.setItem("session_id", result.session_id);

        setState((prev) => ({
          ...prev,
          user: result.user!,
          accessToken: result.access_token!,
          refreshTokenValue: result.refresh_token || null,
          isAuthenticated: true,
          is2FAPending: false,
          challengeId: null,
          expiresAt: null,
          email: null,
          otpPendingToken: null,
          setupRequired: false,
          qrCodeUrl: null,
          manualSecret: null,
          loginStep: "complete",
          isLoading: false,
        }));
      } else {
        // Unexpected response shape
        setState((prev) => ({ ...prev, isLoading: false }));
        console.error("Unexpected login response:", result);
        throw new Error("Unexpected server response during login.");
      }

      return result;
    } catch (error: any) {
      const responseData = error?.response?.data;
      const code = responseData?.code;
      const message = responseData?.message || error.message || "";
      
      if (
        code === "PLATFORM_ACCESS_DENIED_USER_WEB" || 
        error.message === "PLATFORM_ACCESS_DENIED_USER_WEB" ||
        message.includes("does not have access to the web portal")
      ) {
        setState((prev) => ({
          ...prev,
          accessDenied: true,
          accessDeniedMessage: "This account does not have access to the web portal.",
          isLoading: false,
        }));
      } else {
        setState((prev) => ({ ...prev, isLoading: false }));
      }
      throw error;
    }
  }, []);

  const verify2FA = useCallback(async (otpCode: string, useBackupCode?: boolean) => {
    setState((prev) => ({ ...prev, isLoading: true, accessDenied: false, accessDeniedMessage: null }));

    try {
      const challengeId = state.challengeId || (typeof window !== "undefined" ? sessionStorage.getItem("2fa_challenge_id") : null);
      const email = state.email || (typeof window !== "undefined" ? sessionStorage.getItem("2fa_email") : null);

      const result = await api.auth.verify2FA({
        challengeId: challengeId || undefined,
        challenge_id: challengeId || undefined,
        email: email || undefined,
        otp: otpCode,
        otp_code: otpCode,
        otp_pending_token: state.otpPendingToken || undefined,
        useBackupCode,
      });

      if (result.user.role === "user") {
        throw new Error("PLATFORM_ACCESS_DENIED_USER_WEB");
      }

      // Store auth data
      localStorage.setItem("access_token", result.access_token);
      localStorage.setItem("refresh_token", result.refresh_token);
      localStorage.setItem("user", JSON.stringify(result.user));
      if (result.session_id) localStorage.setItem("session_id", result.session_id);

      if (typeof window !== "undefined") {
        sessionStorage.removeItem("2fa_challenge_id");
        sessionStorage.removeItem("2fa_expires_at");
        sessionStorage.removeItem("2fa_email");
        sessionStorage.removeItem("2fa_setup_state");
        sessionStorage.removeItem("2fa_qr_code_url");
      }

      setState((prev) => ({
        ...prev,
        user: result.user,
        accessToken: result.access_token,
        refreshTokenValue: result.refresh_token,
        isAuthenticated: true,
        is2FAPending: false,
        challengeId: null,
        expiresAt: null,
        email: null,
        otpPendingToken: null,
        setupRequired: false,
        qrCodeUrl: null,
        manualSecret: null,
        loginStep: "complete",
        isLoading: false,
      }));

      return result;
    } catch (error: any) {
      const responseData = error?.response?.data;
      const code = responseData?.code;
      const message = responseData?.message || error.message || "";
      
      if (
        code === "PLATFORM_ACCESS_DENIED_USER_WEB" || 
        error.message === "PLATFORM_ACCESS_DENIED_USER_WEB" ||
        message.includes("does not have access to the web portal")
      ) {
        setState((prev) => ({
          ...prev,
          accessDenied: true,
          accessDeniedMessage: "This account does not have access to the web portal.",
          isLoading: false,
        }));
      } else {
        setState((prev) => ({ ...prev, isLoading: false }));
      }
      throw error;
    }
  }, [state.challengeId, state.email, state.otpPendingToken]);

  const verifyFirstOTP = useCallback(async (otpCode: string) => {
    setState((prev) => ({ ...prev, isLoading: true, accessDenied: false, accessDeniedMessage: null }));

    try {
      const challengeId = state.challengeId || (typeof window !== "undefined" ? sessionStorage.getItem("2fa_challenge_id") : null);
      const email = state.email || (typeof window !== "undefined" ? sessionStorage.getItem("2fa_email") : null);

      const result = await api.auth.verify2FA({
        challengeId: challengeId || undefined,
        challenge_id: challengeId || undefined,
        email: email || undefined,
        otp: otpCode,
        otp_code: otpCode,
        otp_pending_token: state.otpPendingToken || undefined,
      });

      if (result.user.role === "user") {
        throw new Error("PLATFORM_ACCESS_DENIED_USER_WEB");
      }

      const backupCodes = result.backupCodes || result.backup_codes || [];

      // Transition to 2fa_verified so mandatory backup-code screen displays
      setState((prev) => ({
        ...prev,
        backupCodes,
        loginStep: "2fa_verified",
        isLoading: false,
      }));

      return result;
    } catch (error: any) {
      const responseData = error?.response?.data;
      const code = responseData?.code;
      const message = responseData?.message || error.message || "";
      
      if (
        code === "PLATFORM_ACCESS_DENIED_USER_WEB" || 
        error.message === "PLATFORM_ACCESS_DENIED_USER_WEB" ||
        message.includes("does not have access to the web portal")
      ) {
        setState((prev) => ({
          ...prev,
          accessDenied: true,
          accessDeniedMessage: "This account does not have access to the web portal.",
          isLoading: false,
        }));
      } else {
        setState((prev) => ({ ...prev, isLoading: false }));
      }
      throw error;
    }
  }, [state.challengeId, state.email, state.otpPendingToken]);

  const completeAuthentication = useCallback((authData: Verify2FAResponse) => {
    localStorage.setItem("access_token", authData.access_token);
    localStorage.setItem("refresh_token", authData.refresh_token);
    localStorage.setItem("user", JSON.stringify(authData.user));
    if (authData.session_id) localStorage.setItem("session_id", authData.session_id);

    if (typeof window !== "undefined") {
      sessionStorage.removeItem("2fa_challenge_id");
      sessionStorage.removeItem("2fa_expires_at");
      sessionStorage.removeItem("2fa_email");
      sessionStorage.removeItem("2fa_setup_state");
      sessionStorage.removeItem("2fa_qr_code_url");
    }

    setState((prev) => ({
      ...prev,
      user: authData.user,
      accessToken: authData.access_token,
      refreshTokenValue: authData.refresh_token,
      isAuthenticated: true,
      is2FAPending: false,
      challengeId: null,
      expiresAt: null,
      email: null,
      otpPendingToken: null,
      setupRequired: false,
      qrCodeUrl: null,
      manualSecret: null,
      loginStep: "complete",
      isLoading: false,
      backupCodes: null,
    }));
  }, []);

  const regenerateQR = useCallback(async () => {
    if (!state.otpPendingToken) {
      throw new Error("No OTP pending token. Please login again.");
    }

    setState((prev) => ({ ...prev, isLoading: true }));

    try {
      const result = await api.auth.regenerateQR(state.otpPendingToken);
      setState((prev) => ({
        ...prev,
        otpPendingToken: result.otp_pending_token,
        qrCodeUrl: result.qr_code_url,
        manualSecret: result.secret || null,
        isLoading: false,
      }));
      return result;
    } catch (error) {
      setState((prev) => ({ ...prev, isLoading: false }));
      throw error;
    }
  }, [state.otpPendingToken]);

  const performLogout = useCallback(async () => {
    const refreshToken = localStorage.getItem("refresh_token");
    const sessionId = localStorage.getItem("session_id");
    try {
      if (refreshToken) {
        await api.auth.logout(refreshToken, sessionId || undefined);
      }
    } catch {
      // Best effort logout
    }

    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");
    localStorage.removeItem("session_id");
    sessionManager.clearEndReason();

    setState({
      user: null,
      accessToken: null,
      refreshTokenValue: null,
      isAuthenticated: false,
      isLoading: false,
      is2FAPending: false,
      otpPendingToken: null,
      challengeId: null,
      expiresAt: null,
      email: null,
      setupRequired: false,
      qrCodeUrl: null,
      manualSecret: null,
      loginStep: "idle",
      accessDenied: false,
      accessDeniedMessage: null,
      backupCodes: null,
    });
  }, []);

  const logout = useCallback(async () => {
    await performLogout();
    toast.success("Logged out successfully");
  }, [performLogout]);

  const refreshUser = useCallback(async () => {
    try {
      const user = await api.auth.getMe();
      if (user.role === "user") {
        throw new Error("Invalid role for web");
      }
      localStorage.setItem("user", JSON.stringify(user));
      setState((prev) => ({ ...prev, user }));
    } catch {
      // Token might be expired or user role changed/invalid
      await performLogout();
    }
  }, [performLogout]);

  const getSessions = useCallback(async () => {
    const sessions = await api.auth.getSessions();
    return sessions;
  }, []);

  const value: AuthContextType = {
    ...state,
    login,
    verify2FA,
    verifyFirstOTP,
    completeAuthentication,
    regenerateQR,
    logout,
    refreshUser,
    getSessions,
    clearAccessDenied,
    clear2FAPending,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
