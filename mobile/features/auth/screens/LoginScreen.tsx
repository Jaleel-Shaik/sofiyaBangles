import { api } from "@/src/api";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { Alert, AppState } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import * as SecureStore from "expo-secure-store";
import {
  getAuth,
  signInWithEmailAndPassword,
  getIdToken,
} from "@react-native-firebase/auth";

import { useAuthStore } from "@/src/store/authStore";
import { apiClient } from "@/src/api/client";
import { getDashboardHref } from "@/src/utils/navigation";
import SuperAdminRestriction from "@/src/components/SuperAdminRestriction";

import {
  OTPStepVerify,
  QRSetupStep,
  BackupCodesStep,
  LoginForm,
} from "../components";

export default function LoginScreen() {
  const { login, set2faPending, clear2faPending, token, user, forceLogout } =
    useAuthStore();

  const [authStep, setAuthStep] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("user");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [otpCode, setOtpCode] = useState("");
  const [otpPendingToken, setOtpPendingToken] = useState("");
  const [otpError, setOtpError] = useState("");
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [manualSecret, setManualSecret] = useState("");
  const [setupOtpCode, setSetupOtpCode] = useState("");
  const [setupToken, setSetupToken] = useState("");
  const [qrExpired, setQrExpired] = useState(false);
  const [countdown, setCountdown] = useState(600);
  const [otpTimer, setOtpTimer] = useState(30);
  const [pendingRedirect, setPendingRedirect] = useState<string | null>(null);
  const [showSuperAdminModal, setShowSuperAdminModal] = useState(false);
  const [navigationReady, setNavigationReady] = useState(false);

  // 2FA Challenge & Backup State
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [challengeExpiresAt, setChallengeExpiresAt] = useState<string | null>(
    null,
  );
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [backupCode, setBackupCode] = useState("");
  const [setupBackupCodes, setSetupBackupCodes] = useState<string[]>([]);
  const pendingAuthSessionRef = useRef<any>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [lockoutMessage, setLockoutMessage] = useState("");

  useEffect(() => {
    setNavigationReady(true);
  }, []);

  // Background / Resume Lifecycle Check for 10-minute 2FA challenge expiry
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (
        nextAppState === "active" &&
        (authStep === "qr_setup" ||
          authStep === "otp_verify" ||
          authStep === "backup_codes")
      ) {
        if (challengeExpiresAt) {
          const expTime = new Date(challengeExpiresAt).getTime();
          if (!Number.isNaN(expTime) && Date.now() >= expTime) {
            Alert.alert(
              "Session Expired",
              "Your 2FA session has expired. Please sign in again.",
              [
                {
                  text: "OK",
                  onPress: () => {
                    setAuthStep("login");
                    setOtpCode("");
                    setOtpError("");
                    setOtpPendingToken("");
                    setSetupOtpCode("");
                    setQrCodeUrl("");
                    setManualSecret("");
                    setChallengeId(null);
                    setChallengeExpiresAt(null);
                    setUseBackupCode(false);
                    setBackupCode("");
                    setIsLocked(false);
                    setLockoutMessage("");
                    clear2faPending();
                  },
                },
              ],
            );
          }
        }
      }
    });

    return () => subscription.remove();
  }, [authStep, challengeExpiresAt, clear2faPending]);

  // Deferred navigation
  useEffect(() => {
    if (pendingRedirect && navigationReady) {
      router.replace(pendingRedirect as any);
      setPendingRedirect(null);
    }
  }, [pendingRedirect, navigationReady]);

  // Navigate by role after successful login
  const navigateAfterLogin = useCallback(() => {
    const { token: t, user: u } = useAuthStore.getState();
    if (!t || !u) return;
    if (u.role === "super_admin") {
      setShowSuperAdminModal(true);
      return;
    }
    const href = getDashboardHref(u, t);
    if (href !== "/login") {
      setPendingRedirect(href as string);
    }
  }, []);

  // Watch for login state changes to navigate
  useEffect(() => {
    if (token && user && authStep !== "login" && authStep !== "register") {
      navigateAfterLogin();
    }
  }, [token, user, authStep, navigateAfterLogin]);

  // Check if a super_admin token was restored from storage
  useEffect(() => {
    const checkSuperAdmin = async () => {
      const storedUser = await SecureStore.getItemAsync("auth_user");
      if (storedUser) {
        try {
          const parsed = JSON.parse(storedUser);
          if (parsed.role === "super_admin") {
            setShowSuperAdminModal(true);
          }
        } catch {}
      }
    };
    checkSuperAdmin();
  }, []);

  const handleSuperAdminLogout = useCallback(async () => {
    setShowSuperAdminModal(false);
    await forceLogout();
    setAuthStep("login");
    setEmail("");
    setPassword("");
    setOtpCode("");
    setSetupOtpCode("");
    setQrCodeUrl("");
    setManualSecret("");
    setQrExpired(false);
    setChallengeId(null);
    setChallengeExpiresAt(null);
    setUseBackupCode(false);
    setBackupCode("");
    setSetupBackupCodes([]);
    setIsLocked(false);
    setLockoutMessage("");
    pendingAuthSessionRef.current = null;
    clear2faPending();
  }, [forceLogout, clear2faPending]);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;
    if (authStep === "qr_setup" && qrCodeUrl) {
      setCountdown(600);
      timer = setInterval(() => {
        setCountdown((prev: number) => {
          if (prev <= 1) {
            if (timer) clearInterval(timer);
            setQrExpired(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [authStep, qrCodeUrl]);

  // 30-second OTP refresh timer
  useEffect(() => {
    if (authStep !== "otp_verify") return;
    setOtpTimer(30);
    const otpTimerInterval = setInterval(() => {
      setOtpTimer((prev) => {
        if (prev <= 1) return 30; // Reset to 30 when it hits 0
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(otpTimerInterval);
  }, [authStep]);

  const handleVerify2FA = async () => {
    if (loading || isLocked) return;
    if (!useBackupCode && (!otpCode.trim() || otpCode.length !== 6)) {
      setOtpError("Please enter a 6-digit code.");
      return;
    }
    if (useBackupCode && !backupCode.trim()) {
      setOtpError("Please enter a backup recovery code.");
      return;
    }
    setOtpError("");
    setLoading(true);
    try {
      let result;
      if (useBackupCode) {
        const sanitized = backupCode.replace(/[\s-]/g, "").toUpperCase();
        result = await api.auth.verify2FAOtp({
          challengeId: challengeId || undefined,
          challenge_id: challengeId || undefined,
          email: email || undefined,
          otp: sanitized,
          otp_code: sanitized,
          useBackupCode: true,
          use_backup_code: true,
          otp_pending_token: otpPendingToken || undefined,
        });
      } else {
        result = await api.auth.verify2FAOtp({
          challengeId: challengeId || undefined,
          challenge_id: challengeId || undefined,
          email: email || undefined,
          otp: otpCode,
          otp_code: otpCode,
          otp_pending_token: otpPendingToken || undefined,
        });
      }

      const responseData = result?.data || result;
      if (responseData?.access_token && responseData?.user) {
        const {
          user: u,
          access_token,
          refresh_token,
          session_id,
        } = responseData;
        if (session_id)
          await SecureStore.setItemAsync("session_id", session_id);
        await login(u, access_token, refresh_token);
        clear2faPending();
        setLoading(false);
        navigateAfterLogin();
        return;
      } else {
        setOtpError("Unexpected response format from server.");
      }
    } catch (err: any) {
      const responseData = err.response?.data;
      const code = responseData?.code;
      const msg = responseData?.message || err.message || "";
      const status = err.response?.status;

      if (
        code === "PLATFORM_ACCESS_DENIED_SUPER_ADMIN_MOBILE" ||
        code === "PLATFORM_ACCESS_DENIED"
      ) {
        await forceLogout();
        setShowSuperAdminModal(true);
        setLoading(false);
        return;
      }

      if (
        status === 423 ||
        code === "ACCOUNT_LOCKED_15_MINUTES" ||
        msg.includes("locked") ||
        msg.includes("15 minutes")
      ) {
        setIsLocked(true);
        setLockoutMessage(
          msg ||
            "Account locked for 15 minutes due to too many failed attempts.",
        );
        setOtpError(msg || "Account locked for 15 minutes.");
        Alert.alert(
          "Account Locked",
          msg || "Please try again in 15 minutes.",
        );
        setLoading(false);
        return;
      }

      if (code === "EXPIRED_OR_INVALID_PENDING_TOKEN") {
        Alert.alert(
          "Session Expired",
          "Your login session has expired. Please sign in again.",
          [
            {
              text: "OK",
              onPress: () => {
                setAuthStep("login");
                setOtpCode("");
                setOtpError("");
                setOtpPendingToken("");
                setChallengeId(null);
                setChallengeExpiresAt(null);
                clear2faPending();
              },
            },
          ],
        );
        setLoading(false);
        return;
      }

      setOtpError(msg || "Invalid OTP or backup recovery code.");
      setOtpCode("");
    } finally {
      setLoading(false);
    }
  };

  const handleSetupFirstOTP = async () => {
    if (loading) return;
    if (!setupOtpCode.trim() || setupOtpCode.length !== 6) {
      Alert.alert(
        "Invalid Code",
        "Please enter the 6-digit code from Google Authenticator.",
      );
      return;
    }
    setLoading(true);
    try {
      const result = await api.auth.verify2FAOtp({
        challengeId: challengeId || undefined,
        challenge_id: challengeId || undefined,
        email: email || undefined,
        otp: setupOtpCode,
        otp_code: setupOtpCode,
        otp_pending_token: setupToken || undefined,
      });
      const responseData = result?.data || result;
      if (responseData?.access_token && responseData?.user) {
        const codes =
          responseData.backupCodes || responseData.backup_codes || [];
        if (codes.length > 0) {
          // Mandatory Backup Codes Acknowledgment Screen
          setSetupBackupCodes(codes);
          pendingAuthSessionRef.current = responseData;
          setAuthStep("backup_codes");
          setLoading(false);
          return;
        }

        const {
          user: u,
          access_token,
          refresh_token,
          session_id,
        } = responseData;
        if (session_id)
          await SecureStore.setItemAsync("session_id", session_id);
        await login(u, access_token, refresh_token);
        clear2faPending();
        setLoading(false);
        navigateAfterLogin();
        return;
      } else {
        Alert.alert(
          "Verification Failed",
          "Unexpected response format from server.",
        );
        setSetupOtpCode("");
      }
    } catch (err: any) {
      const responseData = err.response?.data;
      const code = responseData?.code;
      const msg =
        responseData?.message ||
        err.message ||
        "Invalid code. Please try again.";

      if (
        code === "PLATFORM_ACCESS_DENIED_SUPER_ADMIN_MOBILE" ||
        code === "PLATFORM_ACCESS_DENIED"
      ) {
        await forceLogout();
        setShowSuperAdminModal(true);
        setLoading(false);
        return;
      }

      if (code === "EXPIRED_OR_INVALID_PENDING_TOKEN") {
        Alert.alert(
          "Session Expired",
          "Your setup session has expired. Please sign in again.",
          [
            {
              text: "OK",
              onPress: () => {
                setAuthStep("login");
                setSetupOtpCode("");
                setQrCodeUrl("");
                setManualSecret("");
                setQrExpired(false);
                setChallengeId(null);
                setChallengeExpiresAt(null);
                clear2faPending();
              },
            },
          ],
        );
        setLoading(false);
        return;
      }

      Alert.alert("Verification Failed", msg);
      setSetupOtpCode("");
    } finally {
      setLoading(false);
    }
  };

  const handleFinishBackupCodes = async () => {
    if (!pendingAuthSessionRef.current) return;
    setLoading(true);
    try {
      const {
        user: u,
        access_token,
        refresh_token,
        session_id,
      } = pendingAuthSessionRef.current;
      if (session_id)
        await SecureStore.setItemAsync("session_id", session_id);
      await login(u, access_token, refresh_token);
      clear2faPending();
      setLoading(false);
      navigateAfterLogin();
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to complete authentication.");
      setLoading(false);
    }
  };

  const handleRegenerateQR = async () => {
    setLoading(true);
    try {
      const res = await apiClient.post("/auth/regenerate-qr", {
        otp_pending_token: setupToken,
      });
      const {
        qr_code_url,
        secret: secretKey,
        otp_pending_token,
      } = res.data?.data || res.data;
      if (qr_code_url) setQrCodeUrl(qr_code_url);
      if (secretKey) setManualSecret(secretKey);
      if (otp_pending_token) setSetupToken(otp_pending_token);
      setQrExpired(false);
      setCountdown(600);
    } catch (err: any) {
      const code = err.response?.data?.code;
      if (code === "EXPIRED_OR_INVALID_PENDING_TOKEN") {
        Alert.alert(
          "Session Expired",
          "Your setup session has expired. Please sign in again.",
          [
            {
              text: "OK",
              onPress: () => {
                setAuthStep("login");
                setSetupOtpCode("");
                setQrCodeUrl("");
                setManualSecret("");
                setQrExpired(false);
                clear2faPending();
              },
            },
          ],
        );
        setLoading(false);
        return;
      }
      Alert.alert("Error", "Failed to regenerate QR code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const processLoginResponse = async (
    responseData: any,
  ): Promise<boolean> => {
    const data = responseData?.data || responseData;

    // Case 1: Backend returns direct auth (access_token, refresh_token, user)
    if (data?.access_token && data?.user) {
      const { user: u, access_token, refresh_token, session_id } = data;
      if (session_id)
        await SecureStore.setItemAsync("session_id", session_id);
      await login(u, access_token, refresh_token);
      setLoading(false);
      navigateAfterLogin();
      return true;
    }

    const cid = data?.challengeId || data?.challenge_id || null;
    const exp = data?.expiresAt || data?.expires_at || null;
    if (cid) setChallengeId(cid);
    if (exp) setChallengeExpiresAt(exp);

    const isSetup = Boolean(
      data?.isTotpSetupRequired ?? data?.setup_required,
    );
    const isOtp = Boolean(
      data?.requiresOtp ?? data?.require_otp ?? data?.otp_pending_token,
    );

    // Case 2: First login - need to set up 2FA with QR code
    if (isSetup) {
      setQrCodeUrl(data?.qrCodeUrl || data?.qr_code_url || "");
      setManualSecret(data?.secret || "");
      setSetupToken(data?.otp_pending_token || "");
      setAuthStep("qr_setup");
      set2faPending({
        otp_pending_token: data?.otp_pending_token,
        setup_required: true,
        qr_code_url: data?.qrCodeUrl || data?.qr_code_url,
      });
      return true;
    }

    // Case 3: 2FA already enabled - need OTP verification
    if (isOtp) {
      setOtpPendingToken(data.otp_pending_token || "");
      setAuthStep("otp_verify");
      set2faPending({
        otp_pending_token: data.otp_pending_token,
        setup_required: false,
      });
      return true;
    }

    return false;
  };

  const handleLogin = async () => {
    if (loading) return;
    const errs: Record<string, string | undefined> = {};
    if (!email.trim()) errs.email = "Email is required.";
    if (!password) errs.password = "Password is required.";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setLoading(true);

    try {
      // Strategy 1: Try Firebase Auth first (for mobile-registered users)
      try {
        const fbAuth = getAuth();
        const fbCredential = await signInWithEmailAndPassword(
          fbAuth,
          email,
          password,
        );
        const firebaseToken = await getIdToken(fbCredential.user);

        // Silently migrate password hash so future web logins work too
        try {
          await apiClient.post("/auth/set-password", { email, password });
        } catch {
          /* non-critical */
        }

        // Send Firebase token to backend
        const fbResult = await api.auth.firebaseLoginWithToken(firebaseToken);
        const handled = await processLoginResponse(fbResult);
        if (handled) {
          setLoading(false);
          return;
        }

        // Firebase login returned unexpected response - fall through to backend login
        console.warn(
          "Firebase login returned unexpected response, falling back to backend login",
        );
      } catch (firebaseErr: any) {
        // Firebase Auth failed (user likely registered via web backend without Firebase Auth)
        // Fall through to Strategy 2: Direct backend login
      }

      // Strategy 2: Direct backend /auth/login (for web-registered users or as fallback)
      try {
        const backendResult = await api.auth.loginWith2FA(email, password);
        const handled = await processLoginResponse(backendResult);
        if (handled) {
          setLoading(false);
          return;
        }
      } catch (backendErr: any) {
        const backendMsg =
          backendErr.response?.data?.message || backendErr.message || "";

        // If Strategy 2 fails because password_hash is missing (not wrong credentials),
        // try setting the password via backend, then retry login.
        // Safety: We ONLY do this when the backend explicitly returns code: "PASSWORD_NOT_SET"
        // (distinct from INVALID_CREDENTIALS), so we never overwrite a real password.
        const errorCode = backendErr.response?.data?.code;
        if (errorCode === "PASSWORD_NOT_SET") {
          // Strategy 3: Store password_hash via /auth/set-password then retry
          try {
            await apiClient.post("/auth/set-password", { email, password });

            // Retry /auth/login now that password_hash exists
            const retryResult = await api.auth.loginWith2FA(email, password);
            const retryHandled = await processLoginResponse(retryResult);
            if (retryHandled) {
              setLoading(false);
              return;
            }
          } catch (setPwErr: any) {
            // silent fail
          }

          // If set-password + retry didn't work, try Firebase Auth once more
          try {
            const fbAuth = getAuth();
            const fbCredential = await signInWithEmailAndPassword(
              fbAuth,
              email,
              password,
            );
            const firebaseToken = await getIdToken(fbCredential.user);
            const fbResult = await api.auth.firebaseLoginWithToken(firebaseToken);
            const fbHandled = await processLoginResponse(fbResult);
            if (fbHandled) {
              setLoading(false);
              return;
            }
          } catch (retryErr: any) {
            // silent fail
          }
        }

        // Re-throw so the outer catch shows the original backend error
        throw backendErr;
      }

      // Both strategies failed to produce a recognized response
      Alert.alert(
        "Error",
        "Unexpected response from server. Please contact support.",
      );
    } catch (err: any) {
      const responseData = err.response?.data;
      const code = responseData?.code;
      const msg =
        responseData?.message ||
        err.message ||
        "Login failed. Please check your credentials.";

      if (
        code === "PLATFORM_ACCESS_DENIED_SUPER_ADMIN_MOBILE" ||
        code === "PLATFORM_ACCESS_DENIED"
      ) {
        await forceLogout();
        setShowSuperAdminModal(true);
        return;
      }

      if (msg.includes("locked") || msg.includes("15 minutes")) {
        Alert.alert(
          "Account Locked",
          "Too many failed attempts. Please try again in 15 minutes.",
        );
      } else {
        Alert.alert("Login Failed", msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (loading) return;
    const errs: Record<string, string | undefined> = {};
    if (!fullName.trim()) errs.fullName = "Full name is required.";
    if (!email.trim()) errs.email = "Email is required.";
    if (!password) errs.password = "Password is required.";
    if (!phone.trim()) errs.phone = "Phone is required.";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setLoading(true);
    try {
      await api.auth.register({
        full_name: fullName,
        email,
        password,
        phone,
        role,
      });
      Alert.alert("Success", "Account created. Please login.");
      setAuthStep("login");
      setEmail("");
      setPassword("");
      setFullName("");
      setPhone("");
      setRole("user");
    } catch (err: any) {
      Alert.alert(
        "Registration Failed",
        err.response?.data?.message || err.message || "Something went wrong.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#FFF0F3]">
      {authStep === "otp_verify" ? (
        <OTPStepVerify
          otpCode={otpCode}
          setOtpCode={setOtpCode}
          otpError={otpError}
          setOtpError={setOtpError}
          loading={loading}
          onVerify={handleVerify2FA}
          otpTimer={otpTimer}
          useBackupCode={useBackupCode}
          setUseBackupCode={setUseBackupCode}
          backupCode={backupCode}
          setBackupCode={setBackupCode}
          onVerifyBackup={handleVerify2FA}
          isLocked={isLocked}
          lockoutMessage={lockoutMessage}
          onBack={() => {
            setAuthStep("login");
            setOtpCode("");
            setOtpError("");
            setOtpPendingToken("");
            setUseBackupCode(false);
            setBackupCode("");
            setIsLocked(false);
            setLockoutMessage("");
            clear2faPending();
          }}
        />
      ) : authStep === "qr_setup" ? (
        <QRSetupStep
          qrCodeUrl={qrCodeUrl}
          qrExpired={qrExpired}
          countdown={countdown}
          setupOtpCode={setupOtpCode}
          setSetupOtpCode={setSetupOtpCode}
          loading={loading}
          onVerify={handleSetupFirstOTP}
          onRegenerate={handleRegenerateQR}
          manualSecret={manualSecret}
          onCancel={() => {
            setAuthStep("login");
            setSetupOtpCode("");
            setQrCodeUrl("");
            setManualSecret("");
            setQrExpired(false);
            clear2faPending();
          }}
        />
      ) : authStep === "backup_codes" ? (
        <BackupCodesStep
          codes={setupBackupCodes}
          onFinish={handleFinishBackupCodes}
          loading={loading}
        />
      ) : (
        <LoginForm
          authStep={authStep}
          setAuthStep={setAuthStep}
          email={email}
          setEmail={setEmail}
          password={password}
          setPassword={setPassword}
          fullName={fullName}
          setFullName={setFullName}
          phone={phone}
          setPhone={setPhone}
          role={role}
          setRole={setRole}
          showPassword={showPassword}
          setShowPassword={setShowPassword}
          errors={errors}
          setErrors={setErrors}
          loading={loading}
          onLogin={handleLogin}
          onRegister={handleRegister}
        />
      )}

      <SuperAdminRestriction
        visible={showSuperAdminModal}
        onLogout={handleSuperAdminLogout}
      />
    </SafeAreaView>
  );
}
