"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/features/auth/lib/auth-context";
import Link from "next/link";
import { Settings, Save, ShieldCheck, CheckCircle2, Shield } from "lucide-react";
import toast from "react-hot-toast";
import { api } from "@/src/lib/api";

export default function CommissionSettingsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [adminPct, setAdminPct] = useState<number>(70);
  const [superAdminPct, setSuperAdminPct] = useState<number>(30);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await api.superAdmin.getCommissionSettings();
      if (res) {
        setAdminPct(res.admin_percentage ?? 70);
        setSuperAdminPct(res.super_admin_percentage ?? 30);
      }
    } catch (error) {
      console.error("Failed to load commission settings:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === "super_admin") {
      fetchSettings();
    }
  }, [user]);

  if (!authLoading && user && user.role !== "super_admin") {
    return (
      <div className="bg-white border border-rose-200 rounded-2xl p-8 text-center max-w-lg mx-auto mt-10 shadow-sm">
        <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Shield className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900 mb-2">SuperAdmin Access Required</h2>
        <p className="text-xs text-slate-500 mb-6">
          Modifying platform 70/30 commission split parameters requires Super-Administrator credentials.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 bg-[#E8436E] text-white px-5 py-2.5 rounded-xl text-xs font-bold hover:bg-[#CC3366] transition-colors"
        >
          Return to Store Dashboard
        </Link>
      </div>
    );
  }

  const handleAdminPctChange = (val: number) => {
    const safeVal = Math.max(0, Math.min(100, val));
    setAdminPct(safeVal);
    setSuperAdminPct(100 - safeVal);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPct + superAdminPct !== 100) {
      toast.error("Percentages must sum up to exactly 100%.");
      return;
    }

    setSaving(true);
    try {
      await api.superAdmin.updateCommissionSettings({
        admin_percentage: adminPct,
        super_admin_percentage: superAdminPct,
      });
      toast.success("Platform commission settings updated successfully!");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to update commission settings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Settings className="w-6 h-6 text-rose-600" /> Platform Revenue Split Configuration
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Configure default profit allocation ratios between Admins (Vendors) and SuperAdmin (Platform). Default: 70% / 30%.
        </p>
      </div>

      {/* Settings Form */}
      <form onSubmit={handleSave} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
        {loading ? (
          <p className="text-xs text-slate-400">Loading commission configuration...</p>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Admin Percentage */}
              <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-emerald-900 uppercase">Admin Share Percentage</label>
                  <span className="text-2xl font-black text-emerald-700">{adminPct}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={adminPct}
                  onChange={(e) => handleAdminPctChange(Number(e.target.value))}
                  className="w-full accent-emerald-600 cursor-pointer"
                />
                <p className="text-[11px] text-emerald-700">Percentage allocated to the product creator / seller.</p>
              </div>

              {/* SuperAdmin Percentage */}
              <div className="p-5 rounded-2xl bg-rose-50 border border-rose-200 space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-rose-900 uppercase">SuperAdmin Share Percentage</label>
                  <span className="text-2xl font-black text-rose-700">{superAdminPct}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={superAdminPct}
                  onChange={(e) => handleAdminPctChange(100 - Number(e.target.value))}
                  className="w-full accent-rose-600 cursor-pointer"
                />
                <p className="text-[11px] text-rose-700">Percentage allocated to SuperAdmin platform fees.</p>
              </div>
            </div>

            {/* Validation Banner */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs font-bold text-slate-700">
              <span className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" /> Total Split Allocation Check
              </span>
              <span className="text-emerald-700">{adminPct}% Admin + {superAdminPct}% SuperAdmin = 100% Valid</span>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 bg-rose-600 hover:bg-rose-500 text-white px-6 py-3 rounded-xl text-xs font-bold transition-all shadow-md disabled:opacity-50"
            >
              <Save className="w-4 h-4" /> {saving ? "Saving..." : "Save Commission Split"}
            </button>
          </>
        )}
      </form>
    </div>
  );
}
