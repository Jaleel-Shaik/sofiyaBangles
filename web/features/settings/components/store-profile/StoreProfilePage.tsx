"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Loader2, Store } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import { adminApi, type BusinessProfile } from "@/src/lib/api";

export default function StoreProfilePage() {
  const [profile, setProfile] = useState<BusinessProfile>({
    store_name: "", description: "", business_hours: "", address: "", whatsapp_number: "", email: "", phone_number: ""
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    adminApi.getBusinessProfile().then(d => { if (d) setProfile(d); }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await adminApi.updateBusinessProfile(profile);
      toast.success("Store profile updated");
    } catch { toast.error("Failed to update"); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-[#E8436E]" /></div>;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/settings" className="p-2 rounded-xl hover:bg-[#F5F5F5]"><ArrowLeft className="w-5 h-5" /></Link>
        <div><h1 className="text-2xl font-bold text-[#171717]">Store Profile</h1><p className="text-[#737373] text-sm">Edit store name, description & hours</p></div>
      </div>
      <div className="bg-white rounded-2xl border border-[#E5E5E5] p-6 space-y-4">
        <div className="flex items-center gap-3 mb-4"><Store className="w-5 h-5 text-[#6366F1]" /><span className="font-semibold text-[#171717]">Business Information</span></div>
        {(["store_name","description","business_hours","address","whatsapp_number","email","phone_number"] as const).map(field => (
          <div key={field}>
            <label className="block text-sm font-medium text-[#525252] mb-1 capitalize">{field.replace(/_/g, " ")}</label>
            <input value={profile[field]} onChange={e => setProfile(p => ({ ...p, [field]: e.target.value }))} className="w-full px-4 py-2.5 border border-[#E5E5E5] rounded-xl outline-none focus:border-[#E8436E]" />
          </div>
        ))}
        <div className="flex justify-end pt-2">
          <button onClick={handleSave} disabled={saving} className="gradient-primary text-white font-semibold py-2.5 px-6 rounded-xl">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
