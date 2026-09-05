"use client";

import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/features/auth/lib/auth-context";
import { motion } from "framer-motion";
import {
  Shield,
  Smartphone,
  Loader2,
  ArrowLeft,
  Key,
  KeyRound,
  AlertOctagon,
} from "lucide-react";
import toast from "react-hot-toast";

export default function Verify2FAScreen() {
  const { verify2FA, clear2FAPending, isLoading } = useAuth();
  const [mode, setMode] = useState<"otp" | "backup">("otp");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [backupCode, setBackupCode] = useState("");
  const [error, setError] = useState("");
  const [isLocked, setIsLocked] = useState(false);
  const [lockoutMessage, setLockoutMessage] = useState("");
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [countdown, setCountdown] = useState(30);
  const [canResend, setCanResend] = useState(false);

  // Countdown timer for OTP
  useEffect(() => {
    if (mode !== "otp") return;
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [countdown, mode]);

  // Focus input on mount or mode change
  useEffect(() => {
    if (mode === "otp") {
      inputRefs.current[0]?.focus();
    }
  }, [mode]);

  const handleChange = (index: number, value: string) => {
    if (value.length > 1) {
      // Handle paste
      const digits = value.replace(/\D/g, "").slice(0, 6).split("");
      const newOtp = [...otp];
      digits.forEach((d, i) => {
        if (i < 6) newOtp[i] = d;
      });
      setOtp(newOtp);
      setError("");

      const lastIndex = Math.min(digits.length, 6) - 1;
      if (lastIndex >= 0) {
        inputRefs.current[Math.min(lastIndex, 5)]?.focus();
      }

      if (newOtp.every((d) => d !== "")) {
        handleVerify(newOtp.join(""), false);
      }
      return;
    }

    if (value && !/^\d+$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setError("");

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    if (newOtp.every((d) => d !== "") && newOtp.join("").length === 6) {
      handleVerify(newOtp.join(""), false);
    }
  };

  const handleKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async (code: string, isBackup: boolean) => {
    if (!code) return;
    setError("");

    try {
      await verify2FA(code, isBackup);
      toast.success("2FA verified successfully!");
    } catch (err: any) {
      const status = err?.response?.status;
      const responseData = err?.response?.data;
      const message =
        responseData?.message || err.message || "Verification failed. Please try again.";

      if (
        status === 423 ||
        message.toLowerCase().includes("locked") ||
        message.toLowerCase().includes("15 minutes")
      ) {
        setIsLocked(true);
        setLockoutMessage(message);
        setError(message);
        toast.error("Account locked due to consecutive failed attempts.");
        return;
      }

      setError(message);
      toast.error(message);

      if (!isBackup) {
        setOtp(["", "", "", "", "", ""]);
        inputRefs.current[0]?.focus();
        setCountdown(30);
        setCanResend(false);
      }
    }
  };

  const handleBackupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const sanitized = backupCode.replace(/[\s-]/g, "").toUpperCase();
    if (!sanitized) {
      setError("Please enter a valid backup code.");
      return;
    }
    handleVerify(sanitized, true);
  };

  return (
    <div className="min-h-screen flex">
      {/* Left - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#FFF0F3] via-[#FFD6DE] to-[#FFB3C2] relative overflow-hidden items-center justify-center">
        <div className="relative z-10 text-center px-12">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5, type: "spring" }}
            className="w-24 h-24 bg-white/80 backdrop-blur rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-xl"
          >
            {mode === "backup" ? (
              <KeyRound className="w-12 h-12 text-[#E8436E]" />
            ) : (
              <Smartphone className="w-12 h-12 text-[#E8436E]" />
            )}
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-3xl font-bold text-[#7A0D3C] mb-4"
          >
            {mode === "backup" ? "Recovery Code Sign In" : "Two-Factor Auth"}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-lg text-[#991A4D]"
          >
            {mode === "backup" ? (
              <>
                Use one of your 10 single-use
                <br />
                backup recovery codes
              </>
            ) : (
              <>
                Enter the code from your
                <br />
                Google Authenticator app
              </>
            )}
          </motion.p>
        </div>
      </div>

      {/* Right - Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-white">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <div className="text-center mb-6">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.2 }}
              className="w-16 h-16 bg-gradient-to-br from-[#FFF0F3] to-[#FFD6DE] rounded-2xl flex items-center justify-center mx-auto mb-4"
            >
              {mode === "backup" ? (
                <KeyRound className="w-8 h-8 text-[#E8436E]" />
              ) : (
                <Key className="w-8 h-8 text-[#E8436E]" />
              )}
            </motion.div>
            <h2 className="text-2xl font-bold text-[#171717] mb-2">
              {mode === "backup" ? "Backup Recovery Code" : "Authentication Required"}
            </h2>
            <p className="text-[#737373] text-sm">
              {mode === "backup"
                ? "Enter one of your unused backup recovery codes"
                : "Enter the 6-digit code from Google Authenticator"}
            </p>
          </div>

          {/* Account Locked Banner */}
          {isLocked && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6 text-left">
              <div className="flex gap-3 items-start">
                <AlertOctagon className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-sm text-red-900 mb-1">
                    Account Temporarily Locked
                  </h4>
                  <p className="text-xs text-red-700 leading-relaxed">
                    {lockoutMessage || "Too many failed OTP attempts. Your account has been locked for 15 minutes to protect against unauthorized access."}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Standard OTP Mode */}
          {mode === "otp" ? (
            <>
              <div className="flex justify-center gap-3 mb-6">
                {otp.map((digit, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <input
                      ref={(el) => {
                        inputRefs.current[index] = el;
                      }}
                      type="text"
                      inputMode="numeric"
                      maxLength={index === 0 ? 6 : 1}
                      value={digit}
                      onChange={(e) => handleChange(index, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(index, e)}
                      className={`otp-input ${digit ? "filled" : ""}`}
                      autoComplete="one-time-code"
                      disabled={isLocked || isLoading}
                    />
                  </motion.div>
                ))}
              </div>

              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center text-sm text-red-500 mb-4"
                >
                  {error}
                </motion.p>
              )}

              <button
                onClick={() => {
                  const code = otp.join("");
                  if (code.length === 6) handleVerify(code, false);
                }}
                disabled={isLoading || otp.join("").length !== 6 || isLocked}
                className="w-full gradient-primary text-white font-semibold py-3.5 rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-[#E8436E]/25 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <Shield className="w-5 h-5" />
                    Verify & Sign In
                  </>
                )}
              </button>

              <div className="mt-4 text-center">
                <p className="text-xs text-[#A3A3A3]">
                  Code refreshes in{" "}
                  <span className="text-[#E8436E] font-semibold">
                    {countdown}s
                  </span>
                </p>
              </div>
            </>
          ) : (
            /* Backup Code Mode */
            <form onSubmit={handleBackupSubmit}>
              <div className="mb-5">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Recovery Code
                </label>
                <input
                  type="text"
                  placeholder="e.g. A1B2-C3D4 or A1B2C3D4"
                  value={backupCode}
                  onChange={(e) => {
                    setBackupCode(e.target.value);
                    setError("");
                  }}
                  autoFocus
                  disabled={isLocked || isLoading}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl font-mono text-center text-lg tracking-widest uppercase focus:outline-none focus:border-[#E8436E] focus:ring-2 focus:ring-[#E8436E]/20 transition"
                />
                <p className="text-[11px] text-slate-400 mt-1.5 text-center">
                  Case-insensitive. Dashes and spaces will be stripped automatically.
                </p>
              </div>

              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center text-sm text-red-500 mb-4"
                >
                  {error}
                </motion.p>
              )}

              <button
                type="submit"
                disabled={isLoading || !backupCode.trim() || isLocked}
                className="w-full gradient-primary text-white font-semibold py-3.5 rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-[#E8436E]/25 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <KeyRound className="w-5 h-5" />
                    Verify Recovery Code
                  </>
                )}
              </button>
            </form>
          )}

          {/* Toggle between OTP and Backup Recovery Code */}
          <div className="mt-6 pt-6 border-t border-slate-100 text-center">
            {mode === "otp" ? (
              <button
                onClick={() => {
                  setMode("backup");
                  setError("");
                }}
                className="text-xs font-semibold text-[#E8436E] hover:text-[#CC3366] transition inline-flex items-center gap-1.5"
              >
                <KeyRound className="w-3.5 h-3.5" />
                Lost your phone? Use a Backup Recovery Code
              </button>
            ) : (
              <button
                onClick={() => {
                  setMode("otp");
                  setError("");
                }}
                className="text-xs font-semibold text-[#E8436E] hover:text-[#CC3366] transition inline-flex items-center gap-1.5"
              >
                <Smartphone className="w-3.5 h-3.5" />
                Use Google Authenticator App instead
              </button>
            )}
          </div>

          <div className="mt-6 text-center">
            <button
              onClick={() => {
                clear2FAPending();
                window.location.href = "/";
              }}
              className="text-xs text-[#A3A3A3] hover:text-[#525252] transition-colors inline-flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to login
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
