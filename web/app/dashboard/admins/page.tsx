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
import { ConfirmDialog, Button, Input } from "@/src/components/ui";
import { STRINGS } from "@/src/constants/strings";

export default function AdminsManagementPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [admins, setAdmins] = useState<AdminStaff[]>([]);
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  // Confirmation dialog states
  const [toggleTargetAdmin, setToggleTargetAdmin] = useState<AdminStaff | null>(null);
  const [deleteTargetAdmin, setDeleteTargetAdmin] = useState<AdminStaff | null>(null);
  const [actionSubmitting, setActionSubmitting] = useState(false);

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
        <h2 className="text-lg font-bold text-slate-900 mb-2">
          {STRINGS.superAdminAuth.accessRequiredTitle}
        </h2>
        <p className="text-xs text-slate-500 mb-6">
          {STRINGS.superAdminAuth.adminsAccessRequiredDesc}
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center gap-2 bg-[#E8436E] text-white px-5 py-2.5 min-h-[44px] rounded-xl text-xs font-bold hover:bg-[#CC3366] transition-colors"
        >
          {STRINGS.superAdminAuth.returnToDashboard}
        </Link>
      </div>
    );
  }

  const handleToggleStatus = (admin: AdminStaff) => {
    if (admin.role === "super_admin") {
      toast.error(STRINGS.admins.superAdminCannotDeactivateToast);
      return;
    }
    setToggleTargetAdmin(admin);
  };

  const handleToggleConfirm = async () => {
    if (!toggleTargetAdmin) return;
    const admin = toggleTargetAdmin;
    const newStatus = !admin.isActive;
    setActionSubmitting(true);
    try {
      await api.superAdmin.updateAdminStatus(admin.id, newStatus);
      toast.success(
        STRINGS.admins.toggleStatusSuccessToast(
          newStatus ? STRINGS.admins.activeStatus.toLowerCase() : STRINGS.admins.disabledStatus.toLowerCase()
        )
      );
      setAdmins((prev) =>
        prev.map((a) => (a.id === admin.id ? { ...a, isActive: newStatus } : a))
      );
      setToggleTargetAdmin(null);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to update status");
    } finally {
      setActionSubmitting(false);
    }
  };

  const handleDeleteAdmin = (admin: AdminStaff) => {
    if (admin.role === "super_admin") {
      toast.error(STRINGS.admins.superAdminCannotDeleteToast);
      return;
    }
    setDeleteTargetAdmin(admin);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTargetAdmin) return;
    const admin = deleteTargetAdmin;
    setActionSubmitting(true);
    try {
      await api.superAdmin.deleteAdmin(admin.id);
      toast.success(STRINGS.admins.deleteSuccessToast);
      setAdmins((prev) => prev.filter((a) => a.id !== admin.id));
      setDeleteTargetAdmin(null);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to delete admin");
    } finally {
      setActionSubmitting(false);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim() || !password) {
      toast.error(STRINGS.admins.requiredFieldsToast);
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

      toast.success(STRINGS.admins.createdSuccessToast);
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
            <ShieldCheck className="w-6 h-6 text-[#E8436E]" /> {STRINGS.admins.title}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {STRINGS.admins.subtitle}
          </p>
        </div>

        <button
          onClick={() => setCreateModalOpen(true)}
          className="inline-flex items-center gap-2 bg-[#E8436E] hover:bg-[#CC3366] text-white px-4 py-2.5 min-h-[44px] rounded-xl text-xs font-semibold shadow-md shadow-[#E8436E]/20 transition-all"
        >
          <UserPlus className="w-4 h-4" /> {STRINGS.admins.addAdmin}
        </button>
      </div>

      {/* Staff Grid */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 text-sm bg-white rounded-2xl border border-slate-200">
          <div className="w-8 h-8 border-4 border-[#E8436E] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          {STRINGS.admins.loadingStaff}
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
                        {admin.role === "super_admin" ? STRINGS.admins.superAdminRole : STRINGS.admins.storeAdminRole}
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
                    {admin.isActive ? STRINGS.admins.activeStatus : STRINGS.admins.disabledStatus}
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
                    <span>{admin.phone || STRINGS.admins.noPhone}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-400">
                    <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{admin.created_at ? STRINGS.admins.joinedPrefix(new Date(admin.created_at).toLocaleDateString()) : "—"}</span>
                  </div>
                </div>

                {/* Security Status */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400 flex items-center gap-1">
                    <Key className="w-3 h-3" /> {STRINGS.admins.twoFactorLabel}
                  </span>
                  <span
                    className={`font-semibold ${
                      admin.twoFactorEnabled ? "text-emerald-600" : "text-amber-600"
                    }`}
                  >
                    {admin.twoFactorEnabled ? STRINGS.admins.twoFactorConfigured : STRINGS.admins.twoFactorNotSetUp}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              {admin.role !== "super_admin" && (
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggleStatus(admin)}
                    aria-label={admin.isActive ? STRINGS.admins.deactivateBtn : STRINGS.admins.activateBtn}
                    className={`flex-1 py-2.5 px-3 min-h-[44px] rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                      admin.isActive
                        ? "bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200"
                        : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                    }`}
                  >
                    {admin.isActive ? (
                      <>
                        <UserX className="w-3.5 h-3.5" /> {STRINGS.admins.deactivateBtn}
                      </>
                    ) : (
                      <>
                        <UserCheck className="w-3.5 h-3.5" /> {STRINGS.admins.activateBtn}
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteAdmin(admin)}
                    aria-label={`Delete ${admin.full_name}`}
                    className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                    title={STRINGS.admins.deleteAdminTitle}
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
                  <UserPlus className="w-5 h-5 text-[#E8436E]" /> {STRINGS.admins.modalTitle}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  {STRINGS.admins.modalSubtitle}
                </p>
              </div>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-2 min-h-[44px] min-w-[44px] rounded-xl bg-slate-100 transition-colors flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {STRINGS.admins.fullNameLabel}
                </label>
                <input
                  type="text"
                  required
                  placeholder={STRINGS.admins.fullNamePlaceholder}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3.5 py-2.5 min-h-[44px] bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#E8436E]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {STRINGS.admins.emailLabel}
                </label>
                <input
                  type="email"
                  required
                  placeholder={STRINGS.admins.emailPlaceholder}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 min-h-[44px] bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#E8436E]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {STRINGS.admins.passwordLabel}
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder={STRINGS.admins.passwordPlaceholder}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 min-h-[44px] bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#E8436E]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {STRINGS.admins.phoneLabel}
                </label>
                <input
                  type="tel"
                  placeholder={STRINGS.admins.phonePlaceholder}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 min-h-[44px] bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#E8436E]"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2.5 min-h-[44px] bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
                >
                  {STRINGS.admins.cancelBtn}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 min-h-[44px] bg-[#E8436E] hover:bg-[#CC3366] text-white rounded-xl text-xs font-semibold shadow-md shadow-[#E8436E]/20 transition-all flex items-center gap-1.5"
                >
                  {submitting ? STRINGS.admins.creatingAccountBtn : STRINGS.admins.createAccountBtn}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Accessible Status Toggle Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(toggleTargetAdmin)}
        onClose={() => setToggleTargetAdmin(null)}
        onConfirm={handleToggleConfirm}
        title={
          toggleTargetAdmin
            ? STRINGS.admins.toggleStatusConfirmTitle(!toggleTargetAdmin.isActive)
            : ""
        }
        message={
          toggleTargetAdmin
            ? STRINGS.admins.toggleStatusConfirmMessage(
                toggleTargetAdmin.full_name,
                toggleTargetAdmin.isActive
              )
            : ""
        }
        confirmLabel={
          toggleTargetAdmin?.isActive ? STRINGS.admins.deactivateBtn : STRINGS.admins.activateBtn
        }
        cancelLabel={STRINGS.common.cancel}
        variant={toggleTargetAdmin?.isActive ? "destructive" : "primary"}
        isLoading={actionSubmitting}
      />

      {/* Accessible Account Deletion Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deleteTargetAdmin)}
        onClose={() => setDeleteTargetAdmin(null)}
        onConfirm={handleDeleteConfirm}
        title={STRINGS.admins.deleteConfirmTitle}
        message={
          deleteTargetAdmin
            ? STRINGS.admins.deleteConfirmMessage(
                deleteTargetAdmin.full_name,
                deleteTargetAdmin.email
              )
            : ""
        }
        confirmLabel={STRINGS.common.delete}
        cancelLabel={STRINGS.common.cancel}
        variant="destructive"
        isLoading={actionSubmitting}
      />
    </div>
  );
}
