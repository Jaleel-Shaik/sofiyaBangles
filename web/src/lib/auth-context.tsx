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
  authApi,
  type User,
  type LoginResponse,
  type Verify2FAResponse,
} from "./api";
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
  setupRequired: boolean;
  qrCodeUrl: string | null;
  manualSecret: string | null;
  loginStep: "idle" | "password_verified" | "2fa_verified" | "complete";
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<LoginResponse>;
  verify2FA: (otpCode: string) => Promise<Verify2FAResponse>;
  verifyFirstOTP: (otpCode: string) => Promise<Verify2FAResponse>;
  regenerateQR: () => Promise<{ qr_code_url: string; secret: string; otp_pending_token: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  getSessions: () => Promise<any[]>;
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
    setupRequired: false,
    qrCodeUrl: null,
    manualSecret: null,
    loginStep: "idle",
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
        setState((prev) => ({
          ...prev,
          user,
          accessToken,
          refreshTokenValue,
          isAuthenticated: true,
          loginStep: "complete",
          isLoading: false,
        }));
      } catch {
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        localStorage.removeItem("user");
        setState((prev) => ({ ...prev, isLoading: false }));
      }
    } else {
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  }, []);

  // Session manager: auto-logout on browser close
  useEffect(() => {
    if (typeof window === "undefined" || !state.isAuthenticated) return;

    const unsub = sessionManager.onEnd(async (reason: SessionEndReason) => {
      if (reason === "browser_close" || reason === "tab_close") {
        // Attempt to call logout API (fire-and-forget)
        const refreshToken = localStorage.getItem("refresh_token");
        if (refreshToken) {
          try {
            await authApi.logout(refreshToken);
          } catch {
            // Best effort
          }
        }
        // Clear all auth data
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

  const login = useCallback(async (email: string, password: string) => {
    setState((prev) => ({ ...prev, isLoading: true }));

    try {
      const result = await authApi.login(email, password);

      if (result.setup_required) {
        // First login: need to set up 2FA
        setState((prev) => ({
          ...prev,
          is2FAPending: true,
          otpPendingToken: result.otp_pending_token || null,
          setupRequired: true,
          qrCodeUrl: result.qr_code_url || null,
          manualSecret: result.secret || null,
          loginStep: "password_verified",
          isLoading: false,
        }));
      } else if (result.otp_pending_token) {
        // 2FA is enabled, need OTP verification
        setState((prev) => ({
          ...prev,
          is2FAPending: true,
          otpPendingToken: result.otp_pending_token || null,
          setupRequired: false,
          qrCodeUrl: null,
          manualSecret: null,
          loginStep: "password_verified",
          isLoading: false,
        }));
      }

      return result;
    } catch (error) {
      setState((prev) => ({ ...prev, isLoading: false }));
      throw error;
    }
  }, []);

  const verify2FA = useCallback(async (otpCode: string) => {
    if (!state.otpPendingToken) {
      throw new Error("No OTP pending token. Please login again.");
    }

    setState((prev) => ({ ...prev, isLoading: true }));

    try {
      const result = await authApi.verify2FA(state.otpPendingToken, otpCode);

      // Store auth data
      localStorage.setItem("access_token", result.access_token);
      localStorage.setItem("refresh_token", result.refresh_token);
      localStorage.setItem("user", JSON.stringify(result.user));

      setState((prev) => ({
        ...prev,
        user: result.user,
        accessToken: result.access_token,
        refreshTokenValue: result.refresh_token,
        isAuthenticated: true,
        is2FAPending: false,
        otpPendingToken: null,
        setupRequired: false,
        qrCodeUrl: null,
        manualSecret: null,
        loginStep: "complete",
        isLoading: false,
      }));

      return result;
    } catch (error) {
      setState((prev) => ({ ...prev, isLoading: false }));
      throw error;
    }
  }, [state.otpPendingToken]);

  const verifyFirstOTP = useCallback(async (otpCode: string) => {
    if (!state.otpPendingToken) {
      throw new Error("No OTP pending token. Please login again.");
    }

    setState((prev) => ({ ...prev, isLoading: true }));

    try {
      const result = await authApi.verify2FA(state.otpPendingToken, otpCode);

      // Store auth data
      localStorage.setItem("access_token", result.access_token);
      localStorage.setItem("refresh_token", result.refresh_token);
      localStorage.setItem("user", JSON.stringify(result.user));

      setState((prev) => ({
        ...prev,
        user: result.user,
        accessToken: result.access_token,
        refreshTokenValue: result.refresh_token,
        isAuthenticated: true,
        is2FAPending: false,
        otpPendingToken: null,
        setupRequired: false,
        qrCodeUrl: null,
        manualSecret: null,
        loginStep: "complete",
        isLoading: false,
      }));

      return result;
    } catch (error) {
      setState((prev) => ({ ...prev, isLoading: false }));
      throw error;
    }
  }, [state.otpPendingToken]);

  const regenerateQR = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true }));

    try {
      const result = await authApi.regenerateQR();
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
  }, []);

  const performLogout = useCallback(async () => {
    const refreshToken = localStorage.getItem("refresh_token");
    try {
      if (refreshToken) {
        await authApi.logout(refreshToken);
      }
    } catch {
      // Best effort logout
    }

    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");
    sessionManager.clearEndReason();

    setState({
      user: null,
      accessToken: null,
      refreshTokenValue: null,
      isAuthenticated: false,
      isLoading: false,
      is2FAPending: false,
      otpPendingToken: null,
      setupRequired: false,
      qrCodeUrl: null,
      manualSecret: null,
      loginStep: "idle",
    });
  }, []);

  const logout = useCallback(async () => {
    await performLogout();
    toast.success("Logged out successfully");
  }, [performLogout]);

  const refreshUser = useCallback(async () => {
    try {
      const user = await authApi.getMe();
      localStorage.setItem("user", JSON.stringify(user));
      setState((prev) => ({ ...prev, user }));
    } catch {
      // Token might be expired
      await performLogout();
    }
  }, [performLogout]);

  const getSessions = useCallback(async () => {
    const sessions = await authApi.getSessions();
    return sessions;
  }, []);

  const value: AuthContextType = {
    ...state,
    login,
    verify2FA,
    verifyFirstOTP,
    regenerateQR,
    logout,
    refreshUser,
    getSessions,
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
