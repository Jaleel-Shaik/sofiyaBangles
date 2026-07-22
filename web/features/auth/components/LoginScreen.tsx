"use client";

import { useState } from "react";
import { useAuth } from "@/features/auth/lib/auth-context";
import { motion } from "framer-motion";
import { Eye, EyeOff, Loader2, Shield, Sparkles } from "lucide-react";
import toast from "react-hot-toast";

export default function LoginScreen() {
  const { login, isLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>(
    {}
  );

  const validate = () => {
    const newErrors: { email?: string; password?: string } = {};
    if (!email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "Invalid email format";
    }
    if (!password) {
      newErrors.password = "Password is required";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      const result = await login(email, password);
      // Auth context handles the rest
    } catch (error: any) {
      const message =
        error?.response?.data?.message || error.message || "Login failed";
      toast.error(message);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#FFF0F3] via-[#FFD6DE] to-[#FFB3C2] relative overflow-hidden items-center justify-center">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjLTEuMSAwLTItLjktMi0ydi00YzAtMS4xLjktMiAyLTJoNGMxLjEgMCAyIC45IDIgMnY0YzAgMS4xLS45IDItMiAyaC00eiIvPjwvZz48L2c+PC9zdmc+')] opacity-30" />
        <div className="relative z-10 text-center px-12">
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ duration: 0.8, type: "spring" }}
            className="w-24 h-24 bg-white/80 backdrop-blur rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-xl"
          >
            <Shield className="w-12 h-12 text-[#E8436E]" />
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-5xl font-bold text-[#7A0D3C] mb-4"
          >
            Sofiya Bangles
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="text-xl text-[#991A4D] mb-8"
          >
            Enterprise Admin Portal
          </motion.p>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="flex items-center justify-center gap-2 text-[#B3245A] text-sm"
          >
            <Shield className="w-4 h-4" />
            <span>Protected with 2-Factor Authentication</span>
          </motion.div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-white">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-[#FFF0F3] to-[#FFD6DE] rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-[#E8436E]" />
            </div>
            <h1 className="text-2xl font-bold text-[#171717]">
              Sofiya Bangles
            </h1>
            <p className="text-sm text-[#737373] mt-1">Admin Portal</p>
          </div>

          <div className="mb-8">
            <h2 className="text-3xl font-bold text-[#171717] mb-2">
              Welcome back
            </h2>
            <p className="text-[#737373]">
              Sign in to access your admin dashboard
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-[#525252] mb-1.5">
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) setErrors((p) => ({ ...p, email: undefined }));
                }}
                placeholder="admin@sofiya-bangles.com"
                className={`w-full px-4 py-3 rounded-xl border-2 bg-white transition-all duration-200 outline-none text-[#171717] placeholder:text-[#A3A3A3] ${
                  errors.email
                    ? "border-red-400 focus:border-red-500"
                    : "border-[#E5E5E5] focus:border-[#E8436E] focus:shadow-[0_0_0_3px_rgba(232,67,110,0.1)]"
                }`}
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-500">{errors.email}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-[#525252] mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errors.password)
                      setErrors((p) => ({ ...p, password: undefined }));
                  }}
                  placeholder="Enter your password"
                  className={`w-full px-4 py-3 pr-12 rounded-xl border-2 bg-white transition-all duration-200 outline-none text-[#171717] placeholder:text-[#A3A3A3] ${
                    errors.password
                      ? "border-red-400 focus:border-red-500"
                      : "border-[#E5E5E5] focus:border-[#E8436E] focus:shadow-[0_0_0_3px_rgba(232,67,110,0.1)]"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A3A3A3] hover:text-[#525252] transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-red-500">{errors.password}</p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full gradient-primary text-white font-semibold py-3.5 rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-[#E8436E]/25 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Sign in
                </>
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-[#A3A3A3]">
            Secured with{" "}
            <span className="text-[#E8436E] font-medium">
              Google Authenticator
            </span>{" "}
            2FA
          </p>
        </motion.div>
      </div>
    </div>
  );
}
