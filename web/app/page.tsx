"use client";

import { useEffect } from "react";
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

  // Redirect to dashboard once authenticated
  useEffect(() => {
    if (isAuthenticated && loginStep === "complete" && !isLoading && !accessDenied) {
      router.push("/dashboard");
    }
  }, [isAuthenticated, loginStep, isLoading, accessDenied, router]);

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

  return <LoginScreen />;
}
