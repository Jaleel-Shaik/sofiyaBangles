"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ShieldCheck, ShieldAlert, Lock, ArrowRight, Loader2, AlertCircle, Smartphone } from "lucide-react";
import { useAuth } from "@/features/auth/lib/auth-context";
import { api } from "@/src/lib/api";
import { Button, Card, CardContent } from "@/src/components/ui";
import toast from "react-hot-toast";

function AdminAccessHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const orderNumber = searchParams.get("orderNumber") || "";

  const { user, isAuthenticated, isLoading } = useAuth();
  const [verifying, setVerifying] = useState<boolean>(true);
  const [error, setError] = useState<{ code: string; message: string } | null>(null);
  const [verifiedTarget, setVerifiedTarget] = useState<string | null>(null);
  const [mobileTarget, setMobileTarget] = useState<string | null>(null);
  const [maskedPhone, setMaskedPhone] = useState<string>("");
  const [isMobile, setIsMobile] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsMobile(/Android|iPhone|iPad|iPod/i.test(navigator.userAgent));
    }
  }, []);

  useEffect(() => {
    if (isLoading) return;

    if (!token) {
      setError({
        code: "MISSING_TOKEN",
        message: "No action token was found in the link. Please open the link directly from your WhatsApp order message.",
      });
      setVerifying(false);
      return;
    }

    if (!isAuthenticated) {
      setError({
        code: "AUTH_REQUIRED",
        message: "Admin authentication required. Please sign in with your authorized admin account to access this order.",
      });
      setVerifying(false);
      return;
    }

    const role = (user?.role || "").toLowerCase().trim();
    if (role !== "admin" && role !== "super_admin" && role !== "superadmin") {
      setError({
        code: "CUSTOMER_ACCESS_BLOCKED",
        message: "Access Denied: Customer accounts are strictly prohibited from accessing admin order fulfillment links.",
      });
      setVerifying(false);
      return;
    }

    // Verify token with backend
    const verifyToken = async () => {
      try {
        setVerifying(true);
        const result = await api.admin.verifyAdminLink(token);
        setMaskedPhone(result.adminPhoneMasked);
        setVerifiedTarget(result.targetUrl);
        if (result.mobileAppUrl) {
          setMobileTarget(result.mobileAppUrl);
        }
        toast.success(`Admin identity verified for order ${result.orderNumber}`);

        const mobileDetected = typeof window !== "undefined" && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

        if (mobileDetected && result.mobileAppUrl) {
          // Attempt direct app launch on mobile
          window.location.href = result.mobileAppUrl;
        } else {
          // Desktop: automatically navigate to the web product sell action after brief confirmation
          setTimeout(() => {
            router.replace(result.targetUrl);
          }, 1500);
        }
      } catch (err: any) {
        const errData = err?.response?.data?.error;
        setError({
          code: errData?.code || "VERIFICATION_FAILED",
          message:
            errData?.message ||
            err?.message ||
            "Unable to verify admin action link. It may have expired or already been redeemed.",
        });
      } finally {
        setVerifying(false);
      }
    };

    verifyToken();
  }, [token, orderNumber, user, isAuthenticated, isLoading, router]);

  if (isLoading || verifying) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 flex items-center justify-center mb-4 text-[#E8436E]">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Verifying Admin Access...</h2>
        <p className="text-sm text-slate-500 max-w-sm mt-1">
          Validating phone authorization and security credentials for order {orderNumber || ""}...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-6">
        <Card className="max-w-md w-full border-rose-200 shadow-md">
          <CardContent className="p-6 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-rose-100 flex items-center justify-center mx-auto text-rose-600">
              {error.code === "CUSTOMER_ACCESS_BLOCKED" ? (
                <ShieldAlert className="w-8 h-8" />
              ) : (
                <Lock className="w-8 h-8" />
              )}
            </div>

            <div>
              <h2 className="text-lg font-bold text-slate-900">
                {error.code === "CUSTOMER_ACCESS_BLOCKED"
                  ? "Access Restricted"
                  : error.code === "AUTH_REQUIRED"
                  ? "Admin Login Required"
                  : "Link Verification Failed"}
              </h2>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">{error.message}</p>
            </div>

            {error.code === "AUTH_REQUIRED" && (
              <Button
                variant="primary"
                className="w-full"
                onClick={() =>
                  router.push(
                    `/?redirect=${encodeURIComponent(
                      `/admin/access?token=${token}&orderNumber=${orderNumber}`
                    )}`
                  )
                }
              >
                Sign In as Admin
              </Button>
            )}

            {error.code === "CUSTOMER_ACCESS_BLOCKED" && (
              <Button
                variant="destructive"
                className="w-full"
                onClick={() => {
                  localStorage.clear();
                  router.push("/");
                }}
              >
                Sign Out Customer Session
              </Button>
            )}

            {error.code !== "AUTH_REQUIRED" && error.code !== "CUSTOMER_ACCESS_BLOCKED" && (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => router.push("/dashboard/orders")}
              >
                Go to Orders Dashboard
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-6">
      <Card className="max-w-md w-full border-emerald-200 shadow-md">
        <CardContent className="p-6 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-100 flex items-center justify-center mx-auto text-emerald-600">
            <ShieldCheck className="w-8 h-8" />
          </div>

          <div>
            <h2 className="text-lg font-bold text-slate-900">Authorized Admin Verified</h2>
            <p className="text-xs text-slate-600 mt-1">
              Order <span className="font-semibold text-slate-900">{orderNumber}</span> verified for
              authorized store phone <span className="font-mono text-emerald-700 font-semibold">{maskedPhone}</span>.
            </p>
          </div>

          {mobileTarget ? (
            <div className="space-y-3 pt-2">
              <Button
                variant="primary"
                className="w-full py-3 text-sm flex items-center justify-center gap-2 bg-[#E8436E] text-white shadow-xs"
                onClick={() => {
                  window.location.href = mobileTarget;
                }}
              >
                <Smartphone className="w-4 h-4" />
                Open in Sofiya Bangles Mobile App
              </Button>

              {verifiedTarget && (
                <Button
                  variant="outline"
                  className="w-full text-xs text-slate-600"
                  onClick={() => router.replace(verifiedTarget)}
                >
                  Continue in Web Admin Portal →
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 text-xs text-emerald-800 font-medium">
                Redirecting to order fulfillment screen...
              </div>

              {verifiedTarget && (
                <Button
                  variant="primary"
                  className="w-full"
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                  onClick={() => router.replace(verifiedTarget)}
                >
                  Open Order Now
                </Button>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function AdminAccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[70vh] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#E8436E]" />
        </div>
      }
    >
      <AdminAccessHandler />
    </Suspense>
  );
}
