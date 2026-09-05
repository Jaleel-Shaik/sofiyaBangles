"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/features/auth/lib/auth-context";
import { Shield, ShieldCheck, KeyRound, Smartphone, Laptop, CheckCircle2, Lock, ArrowLeft } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

export default function SecuritySettingsPage() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<any[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);

  const is2FAActive = user?.is_2fa_enabled ?? false;

  return (
    <div className="max-w-4xl space-y-6">
      {/* Back button & Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/settings"
          className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 transition-colors shadow-sm"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Shield className="w-6 h-6 text-[#E8436E]" /> Account Security & Verification
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage your two-factor authentication, administrative access permissions, and session activity.
          </p>
        </div>
      </div>

      {/* 2FA Status Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-start gap-4">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                is2FAActive ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
              }`}
            >
              {is2FAActive ? <ShieldCheck className="w-6 h-6" /> : <Smartphone className="w-6 h-6" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">
                  Two-Factor Authentication (TOTP)
                </h3>
                <span
                  className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                    is2FAActive
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {is2FAActive ? "Active & Enforced" : "Setup Required"}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 max-w-xl leading-relaxed">
                Requires a dynamic 6-digit one-time code from Google Authenticator, Authy, or compatible TOTP apps on every administrative sign-in attempt.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-3">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <div>
              <p className="text-xs font-bold text-slate-800">SHA-1 / 30s Step</p>
              <p className="text-[10px] text-slate-400">RFC 6238 Standard</p>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-3">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <div>
              <p className="text-xs font-bold text-slate-800">Brute-Force Shield</p>
              <p className="text-[10px] text-slate-400">Rate limited to 5 attempts</p>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-3">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <div>
              <p className="text-xs font-bold text-slate-800">Encrypted Secrets</p>
              <p className="text-[10px] text-slate-400">AES-256-GCM encrypted</p>
            </div>
          </div>
        </div>
      </div>

      {/* Role & Access Tier */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-slate-700" /> Administrative Access Tier
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-xl border border-slate-200 space-y-1.5">
            <p className="text-slate-400 font-medium">Assigned Identity</p>
            <p className="font-bold text-slate-900 text-sm">{user?.full_name || "Administrator"}</p>
            <p className="text-slate-500 text-[11px]">{user?.email}</p>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 space-y-1.5">
            <p className="text-slate-400 font-medium">RBAC Role Privilege</p>
            <p className="font-bold text-slate-900 text-sm capitalize">
              {user?.role === "super_admin" ? "Super Administrator (Master)" : "Store Administrator"}
            </p>
            <p className="text-slate-500 text-[11px]">
              {user?.role === "super_admin"
                ? "Unrestricted authority: Commission, Staff, Financial Ledger, Orders"
                : "Standard access: Orders, Inventory, Catalog"}
            </p>
          </div>
        </div>
      </div>

      {/* Session Security Advice */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-3">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Laptop className="w-4 h-4 text-slate-700" /> Current Active Session
        </h3>
        <p className="text-xs text-slate-500 leading-relaxed">
          Your active session is protected by rotating JWT authentication cookies and access tokens. If you suspect unauthorized access, click <span className="font-semibold text-slate-800">Sign Out</span> from the top profile menu to invalidate your browser tokens across all tabs.
        </p>
      </div>
    </div>
  );
}
