"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/lib/auth-context";
import { Loader2 } from "lucide-react";
import LoginScreen from "@/features/auth/components/LoginScreen";
import Verify2FAScreen from "@/features/auth/components/Verify2FAScreen";
import Setup2FAScreen from "@/features/auth/components/Setup2FAScreen";
import AccessDeniedModal from "@/features/auth/components/AccessDeniedModal";

export default function HomePage() {
  const {
    isAuthenticated,
    is2FAPending,
    setupRequired,
    loginStep,
    isLoading,
    accessDenied,
    accessDeniedMessage,
    clearAccessDenied,
  } = useAuth();
  const router = useRouter();

  // isNavigating stays true from the moment we call router.push("/dashboard")
  // until Next.js finishes compiling the route and the browser actually navigates.
  // This prevents the login screen from flashing during that compilation window.
  const [isNavigating, setIsNavigating] = useState(false);

  // Redirect to dashboard once authenticated (any role: admin / super_admin)
  useEffect(() => {
    if (isAuthenticated && loginStep === "complete" && !isLoading && !accessDenied) {
      setIsNavigating(true);
      router.push("/dashboard");
    }
  }, [isAuthenticated, loginStep, isLoading, accessDenied, router]);

  // Global loading (app startup / token validation)
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#E8436E] mx-auto mb-3" />
          <p className="text-sm text-[#A3A3A3]">Loading...</p>
        </div>
      </div>
    );
  }

  if (accessDenied) {
    return (
      <AccessDeniedModal
        message={accessDeniedMessage || "This account does not have access to the web portal."}
        onClose={clearAccessDenied}
      />
    );
  }

  if (is2FAPending && setupRequired) {
    return <Setup2FAScreen />;
  }

  if (is2FAPending && !setupRequired) {
    return <Verify2FAScreen />;
  }

  // ─── KEY FIX ───────────────────────────────────────────────────────────────
  // After 2FA/direct login succeeds, isAuthenticated=true and router.push fires.
  // Next.js takes 2–3 s to compile /dashboard on first visit.
  // Without this guard the component falls through to <LoginScreen /> during
  // that window, causing a visible login-page flash for ALL roles.
  // Show a branded loading splash instead until the navigation completes.
  // ───────────────────────────────────────────────────────────────────────────
  if (isNavigating || isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#FFF0F3] via-white to-[#FFD6DE]">
        <div className="text-center">
          {/* Brand icon */}
          <div className="w-20 h-20 bg-gradient-to-br from-[#E8436E] to-[#CC3366] rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-[#E8436E]/30">
            <svg
              className="w-10 h-10 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-[#171717] mb-1">Sofiya Bangles</h1>
          <p className="text-[#737373] text-sm mb-8">Taking you to the portal...</p>
          {/* Animated bounce dots */}
          <div className="flex items-center justify-center gap-2">
            <div
              className="w-2.5 h-2.5 bg-[#E8436E] rounded-full animate-bounce"
              style={{ animationDelay: "0ms" }}
            />
            <div
              className="w-2.5 h-2.5 bg-[#E8436E] rounded-full animate-bounce"
              style={{ animationDelay: "150ms" }}
            />
            <div
              className="w-2.5 h-2.5 bg-[#E8436E] rounded-full animate-bounce"
              style={{ animationDelay: "300ms" }}
            />
          </div>
        </div>
      </div>
    );
  }

  return <LoginScreen />;
}
