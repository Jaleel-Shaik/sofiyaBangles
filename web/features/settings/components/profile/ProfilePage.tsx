"use client";

import { useState, useRef } from "react";
import { useAuth } from "@/features/auth/lib/auth-context";
import { authApi } from "@/src/lib/api";
import { ArrowLeft, Camera, Loader2, User, Mail, Phone, Shield, Pencil, X, Check } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import Image from "next/image";

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ full_name: "", phone: "" });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const startEditing = () => {
    setForm({ full_name: user?.full_name || "", phone: user?.phone || "" });
    setEditing(true);
  };

  const cancelEditing = () => {
    setEditing(false);
  };

  const handleSave = async () => {
    if (saving) return;
    if (!form.full_name.trim()) {
      toast.error("Full name is required");
      return;
    }
    setSaving(true);
    try {
      await authApi.updateProfile({ full_name: form.full_name.trim(), phone: form.phone.trim() });
      await refreshUser();
      toast.success("Profile updated");
      setEditing(false);
    } catch {
      toast.error("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Please select an image file."); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Image must be less than 5MB."); return; }

    setUploading(true);
    try {
      await authApi.uploadAvatar(file);
      await refreshUser();
      toast.success("Profile picture updated!");
    } catch {
      toast.error("Failed to upload profile picture.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const infoFields = [
    { icon: User, label: "Full Name", key: "full_name" as const, value: user?.full_name },
    { icon: Mail, label: "Email", key: "email" as const, value: user?.email },
    { icon: Phone, label: "Phone", key: "phone" as const, value: user?.phone },
    { icon: Shield, label: "Role", key: "role" as const, value: user?.role },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/settings" className="p-2 rounded-xl hover:bg-[#F5F5F5]"><ArrowLeft className="w-5 h-5" /></Link>
        <div>
          <h1 className="text-2xl font-bold text-[#171717]">My Profile</h1>
          <p className="text-[#737373] mt-1">Manage your personal profile information</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-[#E5E5E5] p-6 max-w-lg">
        {/* Avatar Section */}
        <div className="flex items-center gap-6">
          <div className="relative">
            <button
              onClick={handleAvatarClick}
              disabled={uploading}
              className="w-24 h-24 rounded-full overflow-hidden bg-gradient-to-br from-[#E8436E] to-[#CC3366] flex items-center justify-center text-white text-3xl font-bold group hover:opacity-90 transition-opacity disabled:opacity-70"
            >
              {uploading ? (
                <Loader2 className="w-8 h-8 animate-spin" />
              ) : user?.avatar_url ? (
                <Image src={user.avatar_url} alt="Profile" width={96} height={96} className="w-full h-full object-cover" />
              ) : (
                user?.full_name?.charAt(0)?.toUpperCase() || "A"
              )}
              <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="w-8 h-8 text-white" />
              </div>
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-[#171717]">{user?.full_name || "Admin"}</h2>
            <p className="text-sm text-[#737373]">{user?.email}</p>
            <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#FFF0F3] text-[#E8436E] capitalize">
              {user?.role || "admin"}
            </span>
          </div>
        </div>

        {/* Profile Details */}
        <div className="mt-6 pt-6 border-t border-[#E5E5E5]">
          <p className="text-xs text-[#A3A3A3] uppercase tracking-wider font-semibold mb-3">Personal Information</p>

          <div className="space-y-3">
            {infoFields.map(({ icon: Icon, label, key, value }) => (
              <div key={key} className="flex items-center gap-3">
                <Icon className="w-4 h-4 text-[#A3A3A3] shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-[#A3A3A3]">{label}</p>
                  {editing && (key === "full_name" || key === "phone") ? (
                    <input
                      value={key === "full_name" ? form.full_name : form.phone}
                      onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                      className="w-full text-sm font-medium text-[#171717] bg-[#F5F5F5] border border-[#E5E5E5] rounded-lg px-2 py-1 outline-none focus:border-[#E8436E]"
                    />
                  ) : (
                    <p className="text-sm font-medium text-[#171717] truncate capitalize">
                      {value || "—"}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="mt-6 pt-4 border-t border-[#E5E5E5] flex justify-end">
          {!editing ? (
            <button onClick={startEditing} className="gradient-primary text-white font-semibold py-2.5 px-6 rounded-xl flex items-center gap-2">
              <Pencil className="w-4 h-4" />
              Edit Profile
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <button onClick={cancelEditing} disabled={saving} className="px-5 py-2.5 rounded-xl border border-[#E5E5E5] text-[#525252] font-semibold hover:bg-[#F5F5F5] transition-colors disabled:opacity-60 disabled:pointer-events-none disabled:cursor-not-allowed cursor-pointer">
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving} className="gradient-primary text-white font-semibold py-2.5 px-6 rounded-xl disabled:opacity-60 disabled:pointer-events-none disabled:cursor-not-allowed cursor-pointer flex items-center gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
