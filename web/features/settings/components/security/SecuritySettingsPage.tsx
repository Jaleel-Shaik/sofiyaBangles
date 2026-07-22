"use client";

import { useState } from "react";
import { ArrowLeft, Shield, Lock, Loader2 } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import { useAuth } from "@/features/auth/lib/auth-context";
import { authApi } from "@/src/lib/api";

export default function SecuritySettingsPage() {
  const { user } = useAuth();
  const [password, setPassword] = useState("");
  const [disabling, setDisabling] = useState(false);

  const handleDisable2FA = async () => {
    if (!password) { toast.error("Enter your password to disable 2FA"); return; }
    if (!confirm("Disable 2FA? This reduces account security.")) return;
    setDisabling(true);
    try {
      await authApi.disable2FA(password);
      toast.success("2FA disabled");
      setPassword("");
    } catch { toast.error("Failed to disable 2FA"); }
    finally { setDisabling(false); }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/settings" className="p-2 rounded-xl hover:bg-[#F5F5F5]"><ArrowLeft className="w-5 h-5" /></Link>
        <div><h1 className="text-2xl font-bold text-[#171717]">Security Settings</h1><p className="text-[#737373] text-sm">Password and 2FA management</p></div>
      </div>
      <div className="bg-white rounded-2xl border border-[#E5E5E5] p-6 space-y-4">
        <div className="flex items-center gap-3 mb-4"><Shield className="w-5 h-5 text-green-500" /><span className="font-semibold text-[#171717]">Two-Factor Authentication</span></div>
        <div className="flex items-center justify-between p-4 bg-green-50 rounded-xl">
          <div><p className="font-medium text-[#171717]">Google Authenticator</p><p className="text-xs text-[#64748B]">Active since setup</p></div>
          <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">Active</span>
        </div>
        <div className="border-t border-[#E5E5E5] pt-4">
          <p className="text-sm font-medium text-[#525252] mb-2">Disable 2FA</p>
          <div className="flex gap-3">
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter current password" className="flex-1 px-4 py-2.5 border border-[#E5E5E5] rounded-xl outline-none focus:border-red-400 text-sm" />
            <button onClick={handleDisable2FA} disabled={disabling} className="px-5 py-2.5 bg-red-500 text-white font-semibold rounded-xl hover:bg-red-600 text-sm">
              {disabling ? <Loader2 className="w-4 h-4 animate-spin" /> : "Disable"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
