"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/lib/auth-context";
import Setup2FAScreen from "@/features/auth/components/Setup2FAScreen";
import { Loader2, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";

export default function TwoFactorSetupPage() {
  const router = useRouter();
  const { is2FAPending, setupRequired, clear2FAPending, isAuthenticated } = useAuth();
  const [checking, setChecking] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (isAuthenticated) {
      router.replace("/dashboard");
      return;
    }

    const challengeId = sessionStorage.getItem("2fa_challenge_id");
    const expiresAt = sessionStorage.getItem("2fa_expires_at");
    const setupState = sessionStorage.getItem("2fa_setup_state");

    if (!challengeId || !expiresAt || setupState !== "setup_required") {
      // Missing setup challenge
      router.replace("/");
      return;
    }

    const expiryTime = new Date(expiresAt).getTime();
    if (Number.isNaN(expiryTime) || Date.now() >= expiryTime) {
      // Expired challenge
      clear2FAPending();
      setSessionExpired(true);
      toast.error("Setup session expired. Please log in again.");
      setTimeout(() => {
        router.replace("/");
      }, 2000);
      return;
    }

    setChecking(false);

    // Active timer to redirect when expiry passes while on page
    const remainingMs = expiryTime - Date.now();
    const expiryTimer = setTimeout(() => {
      clear2FAPending();
      setSessionExpired(true);
      toast.error("Setup session expired. Please log in again.");
      setTimeout(() => {
        router.replace("/");
      }, 2000);
    }, remainingMs);

    return () => clearTimeout(expiryTimer);
  }, [clear2FAPending, isAuthenticated, router]);

  if (sessionExpired) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA] p-4">
        <div className="max-w-md w-full bg-white rounded-2xl p-6 shadow-sm border border-red-100 text-center">
          <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4 text-red-500">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-2">Setup Session Expired</h2>
          <p className="text-sm text-slate-500 mb-4">
            Your 10-minute setup window has expired. Redirecting you to login...
          </p>
          <button
            onClick={() => router.replace("/")}
            className="w-full py-2.5 px-4 rounded-xl text-sm font-semibold bg-slate-900 text-white hover:bg-slate-800 transition"
          >
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#E8436E] mx-auto mb-3" />
          <p className="text-sm text-[#A3A3A3]">Checking security session...</p>
        </div>
      </div>
    );
  }

  return <Setup2FAScreen />;
}
