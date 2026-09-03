"use client";

import { useState, useEffect, useRef } from "react";
import { ArrowLeft, Loader2, Store, Camera, ImageIcon, Pencil, Check, MessageCircle, Mail, Phone, MapPin } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import toast from "react-hot-toast";
import { adminApi, type BusinessProfile } from "@/src/lib/api";

export default function StoreProfilePage() {
  const [profile, setProfile] = useState<BusinessProfile>({
    store_name: "", description: "", whatsapp_number: "", email: "", phone_number: ""
  } as BusinessProfile);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({} as Partial<BusinessProfile>);
  const logoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    adminApi.getBusinessProfile()
      .then(d => { if (d) { setProfile(d); setForm(d); } })
      .catch(() => toast.error("Failed to load store profile"))
      .finally(() => setLoading(false));
  }, []);

  const startEditing = () => {
    setForm({ ...profile });
    setEditing(true);
  };

  const cancelEditing = () => {
    setEditing(false);
  };

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const updated = await adminApi.updateBusinessProfile(form);
      setProfile(updated);
      toast.success("Store profile updated");
      setEditing(false);
    } catch {
      toast.error("Failed to update");
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Please select an image file."); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Image must be less than 5MB."); return; }

    setUploading(true);
    try {
      const updated = await adminApi.uploadBusinessLogo(file);
      setProfile(prev => ({ ...prev, logo_url: updated.logo_url }));
      toast.success("Store logo updated!");
    } catch {
      toast.error("Failed to upload logo.");
    } finally {
      setUploading(false);
      if (logoInputRef.current) logoInputRef.current.value = "";
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-[#E8436E]" /></div>;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/settings" className="p-2 rounded-xl hover:bg-[#F5F5F5]"><ArrowLeft className="w-5 h-5" /></Link>
        <div>
          <h1 className="text-2xl font-bold text-[#171717]">Store Profile</h1>
          <p className="text-[#737373] text-sm">Manage your store&apos;s public information</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-[#E5E5E5] divide-y divide-[#E5E5E5]">
        {/* Logo Section */}
        <div className="p-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => logoInputRef.current?.click()}
              disabled={uploading}
              className="w-20 h-20 rounded-xl border-2 border-dashed border-[#E5E5E5] flex items-center justify-center hover:border-[#E8436E] transition-all overflow-hidden group relative disabled:opacity-70 shrink-0"
            >
              {uploading ? (
                <Loader2 className="w-6 h-6 animate-spin text-[#E8436E]" />
              ) : profile.logo_url ? (
                <Image src={profile.logo_url} alt="Store logo" width={80} height={80} className="w-full h-full object-cover" />
              ) : (
                <ImageIcon className="w-6 h-6 text-[#A3A3A3]" />
              )}
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-xl">
                <Camera className="w-6 h-6 text-white" />
              </div>
            </button>
            <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
            <div>
              <p className="font-semibold text-[#171717]">{profile.store_name || "Your Store"}</p>
              <p className="text-xs text-[#A3A3A3] mt-0.5">Upload a square logo • Max 5MB</p>
            </div>
          </div>
        </div>

        {/* Store Info */}
        <div className="p-6 space-y-5">
          <div className="flex items-center gap-2">
            <Store className="w-5 h-5 text-[#6366F1]" />
            <span className="font-semibold text-[#171717]">Store Information</span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#A3A3A3] uppercase tracking-wider mb-1.5">Store Name</label>
            {editing ? (
              <input value={form.store_name || ""} onChange={e => setForm(f => ({ ...f, store_name: e.target.value }))} className="w-full px-4 py-2.5 border border-[#E5E5E5] rounded-xl outline-none focus:border-[#E8436E] text-sm font-medium" />
            ) : (
              <p className="text-sm font-medium text-[#171717]">{profile.store_name || "—"}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#A3A3A3] uppercase tracking-wider mb-1.5">Description</label>
            {editing ? (
              <textarea value={form.description || ""} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={4} className="w-full px-4 py-2.5 border border-[#E5E5E5] rounded-xl outline-none focus:border-[#E8436E] resize-none text-sm" />
            ) : (
              <p className="text-sm font-medium text-[#171717] leading-relaxed">{profile.description || "—"}</p>
            )}
          </div>
        </div>

        {/* Location */}
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-rose-500" />
            <span className="font-semibold text-[#171717]">Store Location</span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#A3A3A3] uppercase tracking-wider mb-1.5">
              Address
            </label>
            {editing ? (
              <textarea
                value={form.address || ""}
                onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                rows={3}
                placeholder="123 Jewelry Market Road, Near Heritage Square, City Center, State 12345"
                className="w-full px-4 py-2.5 border border-[#E5E5E5] rounded-xl outline-none focus:border-[#E8436E] resize-none text-sm"
              />
            ) : (
              <p className="text-sm font-medium text-[#171717] leading-relaxed">{profile.address || "—"}</p>
            )}
          </div>
        </div>

        {/* Contact Info */}
        <div className="p-6 space-y-5">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-[#10B981]" />
            <span className="font-semibold text-[#171717]">Contact Information</span>
          </div>

          {[
            { icon: MessageCircle, label: "WhatsApp Number", key: "whatsapp_number" as const, color: "text-[#10B981]" },
            { icon: Mail, label: "Email", key: "email" as const, color: "text-[#3B82F6]" },
            { icon: Phone, label: "Phone Number", key: "phone_number" as const, color: "text-[#F59E0B]" },
          ].map(({ icon: Icon, label, key, color }) => (
            <div key={key}>
              <label className="block text-xs font-semibold text-[#A3A3A3] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Icon className={`w-3.5 h-3.5 ${color}`} />
                {label}
              </label>
              {editing ? (
                <input value={form[key] || ""} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} className="w-full px-4 py-2.5 border border-[#E5E5E5] rounded-xl outline-none focus:border-[#E8436E] text-sm font-medium" />
              ) : (
                <p className="text-sm font-medium text-[#171717]">{profile[key] || "—"}</p>
              )}
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="p-6 flex justify-end">
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
