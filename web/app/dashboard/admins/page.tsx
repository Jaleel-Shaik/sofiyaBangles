"use client";

import { useState, useEffect } from "react";
import {
  ShieldCheck,
  UserPlus,
  Shield,
  UserCheck,
  UserX,
  Trash2,
  Phone,
  Mail,
  Calendar,
  Lock,
  Key,
  AlertTriangle,
} from "lucide-react";
import { type AdminStaff } from "@/src/lib/api";
import { useAuth } from "@/features/auth/lib/auth-context";
import Link from "next/link";
import toast from "react-hot-toast";
import { api } from "@/src/lib/api";

export default function AdminsManagementPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [admins, setAdmins] = useState<AdminStaff[]>([]);
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  // Create form state
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchAdmins = async () => {
    setLoading(true);
    try {
      const data = await api.superAdmin.getAdmins();
      setAdmins(data || []);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to load admin staff");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === "super_admin") {
      fetchAdmins();
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
          Managing administrator accounts and security roles requires Super-Administrator credentials.
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

  const handleToggleStatus = async (admin: AdminStaff) => {
    if (admin.role === "super_admin") {
      toast.error("SuperAdmin accounts cannot be deactivated.");
      return;
    }

    const newStatus = !admin.isActive;
    const confirmMsg = newStatus
      ? `Are you sure you want to activate ${admin.full_name}? They will be able to log in.`
      : `Are you sure you want to deactivate ${admin.full_name}? They will immediately be blocked from logging in.`;

    if (!confirm(confirmMsg)) return;

    try {
      await api.superAdmin.updateAdminStatus(admin.id, newStatus);
      toast.success(`Admin ${newStatus ? "activated" : "deactivated"} successfully.`);
      setAdmins((prev) =>
        prev.map((a) => (a.id === admin.id ? { ...a, isActive: newStatus } : a))
      );
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to update status");
    }
  };

  const handleDeleteAdmin = async (admin: AdminStaff) => {
    if (admin.role === "super_admin") {
      toast.error("SuperAdmin accounts cannot be deleted.");
      return;
    }

    if (!confirm(`Are you sure you want to delete ${admin.full_name} (${admin.email})? This action cannot be undone.`)) {
      return;
    }

    try {
      await api.superAdmin.deleteAdmin(admin.id);
      toast.success("Administrator deleted successfully.");
      setAdmins((prev) => prev.filter((a) => a.id !== admin.id));
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to delete admin");
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim() || !password) {
      toast.error("Please fill in all required fields.");
      return;
    }

    setSubmitting(true);
    try {
      await api.superAdmin.createAdmin({
        full_name: fullName.trim(),
        email: email.trim().toLowerCase(),
        password,
        phone: phone.trim() || undefined,
      });

      toast.success("New administrator created successfully!");
      setCreateModalOpen(false);
      setFullName("");
      setEmail("");
      setPassword("");
      setPhone("");
      await fetchAdmins();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to create administrator");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-[#E8436E]" /> Staff & Administrator Control
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage store managers, configure staff permissions, and monitor security statuses.
          </p>
        </div>

        <button
          onClick={() => setCreateModalOpen(true)}
          className="inline-flex items-center gap-2 bg-[#E8436E] hover:bg-[#CC3366] text-white px-4 py-2.5 rounded-xl text-xs font-semibold shadow-md shadow-[#E8436E]/20 transition-all"
        >
          <UserPlus className="w-4 h-4" /> Add Administrator
        </button>
      </div>

      {/* Staff Grid */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 text-sm bg-white rounded-2xl border border-slate-200">
          <div className="w-8 h-8 border-4 border-[#E8436E] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          Loading store staff...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {admins.map((admin) => (
            <div
              key={admin.id}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4 hover:border-slate-300 transition-all flex flex-col justify-between"
            >
              <div className="space-y-3">
                {/* Header info */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#E8436E] to-[#CC3366] text-white flex items-center justify-center font-bold text-base shadow-sm">
                      {admin.full_name?.charAt(0)?.toUpperCase() || "A"}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm leading-tight">
                        {admin.full_name}
                      </h3>
                      <span
                        className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md mt-1 ${
                          admin.role === "super_admin"
                            ? "bg-purple-100 text-purple-700 border border-purple-200"
                            : "bg-slate-100 text-slate-700 border border-slate-200"
                        }`}
                      >
                        {admin.role === "super_admin" ? "SuperAdmin" : "Store Admin"}
                      </span>
                    </div>
                  </div>

                  {/* Status badge */}
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      admin.isActive
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-rose-50 text-rose-700 border border-rose-200"
                    }`}
                  >
                    {admin.isActive ? "Active" : "Disabled"}
                  </span>
                </div>

                {/* Details */}
                <div className="space-y-1.5 text-xs text-slate-600 pt-1">
                  <div className="flex items-center gap-2 truncate">
                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{admin.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{admin.phone || "No phone registered"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-400">
                    <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>Joined {admin.created_at ? new Date(admin.created_at).toLocaleDateString() : "—"}</span>
                  </div>
                </div>

                {/* Security Status */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400 flex items-center gap-1">
                    <Key className="w-3 h-3" /> Two-Factor Auth:
                  </span>
                  <span
                    className={`font-semibold ${
                      admin.twoFactorEnabled ? "text-emerald-600" : "text-amber-600"
                    }`}
                  >
                    {admin.twoFactorEnabled ? "Configured" : "Not Set Up"}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              {admin.role !== "super_admin" && (
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    onClick={() => handleToggleStatus(admin)}
                    className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                      admin.isActive
                        ? "bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200"
                        : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                    }`}
                  >
                    {admin.isActive ? (
                      <>
                        <UserX className="w-3.5 h-3.5" /> Deactivate
                      </>
                    ) : (
                      <>
                        <UserCheck className="w-3.5 h-3.5" /> Activate
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => handleDeleteAdmin(admin)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                    title="Delete Administrator"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add Administrator Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-[#E8436E]" /> Add New Administrator
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Create a new store manager account.
                </p>
              </div>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl bg-slate-100 transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kumar"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#E8436E]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  placeholder="admin@sofiyabangles.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#E8436E]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Initial Password * (min 6 characters)
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#E8436E]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Phone Number (Optional)
                </label>
                <input
                  type="tel"
                  placeholder="+919876543210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#E8436E]"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-[#E8436E] hover:bg-[#CC3366] text-white rounded-xl text-xs font-semibold shadow-md shadow-[#E8436E]/20 transition-all flex items-center gap-1.5"
                >
                  {submitting ? "Creating..." : "Create Admin Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
