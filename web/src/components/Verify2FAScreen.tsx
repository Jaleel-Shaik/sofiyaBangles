"use client";

import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/src/lib/auth-context";
import { motion } from "framer-motion";
import {
  Shield,
  Smartphone,
  Loader2,
  ArrowLeft,
  Key,
} from "lucide-react";
import toast from "react-hot-toast";

export default function Verify2FAScreen() {
  const { verify2FA, isLoading } = useAuth();
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [countdown, setCountdown] = useState(30);
  const [canResend, setCanResend] = useState(false);

  // Countdown timer for OTP
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [countdown]);

  // Focus first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

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

      // Focus last filled input
      const lastIndex = Math.min(digits.length, 6) - 1;
      if (lastIndex >= 0) {
        inputRefs.current[Math.min(lastIndex, 5)]?.focus();
      }

      // Auto-submit if all filled
      if (newOtp.every((d) => d !== "")) {
        handleVerify(newOtp.join(""));
      }
      return;
    }

    if (value && !/^\d+$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setError("");

    // Auto-advance to next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit if all 6 digits filled
    if (newOtp.every((d) => d !== "") && newOtp.join("").length === 6) {
      handleVerify(newOtp.join(""));
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

  const handleVerify = async (otpCode: string) => {
    if (otpCode.length !== 6) return;

    try {
      await verify2FA(otpCode);
      toast.success("2FA verified successfully!");
    } catch (error: any) {
      const message =
        error?.response?.data?.message || "Invalid OTP code. Please try again.";
      setError(message);
      toast.error(message);
      // Clear and refocus
      setOtp(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
      setCountdown(30);
      setCanResend(false);
    }
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
            <Smartphone className="w-12 h-12 text-[#E8436E]" />
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-3xl font-bold text-[#7A0D3C] mb-4"
          >
            Two-Factor Auth
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-lg text-[#991A4D]"
          >
            Enter the code from your
            <br />
            Google Authenticator app
          </motion.p>
        </div>
      </div>

      {/* Right - OTP Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-white">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.2 }}
              className="w-16 h-16 bg-gradient-to-br from-[#FFF0F3] to-[#FFD6DE] rounded-2xl flex items-center justify-center mx-auto mb-4"
            >
              <Key className="w-8 h-8 text-[#E8436E]" />
            </motion.div>
            <h2 className="text-2xl font-bold text-[#171717] mb-2">
              Authentication Required
            </h2>
            <p className="text-[#737373]">
              Enter the 6-digit code from your Google Authenticator app
            </p>
          </div>

          {/* OTP Input */}
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

          {/* Verify Button */}
          <button
            onClick={() => {
              const code = otp.join("");
              if (code.length === 6) handleVerify(code);
            }}
            disabled={isLoading || otp.join("").length !== 6}
            className="w-full gradient-primary text-white font-semibold py-3.5 rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-[#E8436E]/25 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100 flex items-center justify-center gap-2"
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

          {/* OTP Timer */}
          <div className="mt-6 text-center">
            {canResend ? (
              <p className="text-sm text-[#A3A3A3]">
                Your code will refresh automatically in{" "}
                <span className="text-[#E8436E] font-semibold">{countdown}s</span>
              </p>
            ) : (
              <p className="text-sm text-[#A3A3A3]">
                Code refreshes in{" "}
                <span className="text-[#E8436E] font-semibold">
                  {countdown}s
                </span>
              </p>
            )}
          </div>

          <div className="mt-8 text-center">
            <button
              onClick={() => window.location.reload()}
              className="text-sm text-[#A3A3A3] hover:text-[#525252] transition-colors inline-flex items-center gap-1"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to login
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
