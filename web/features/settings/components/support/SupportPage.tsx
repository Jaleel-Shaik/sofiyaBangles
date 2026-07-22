"use client";

import { useState } from "react";
import { ArrowLeft, MessageCircle, Mail, Phone } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

export default function SupportContactsPage() {
  const [whatsapp, setWhatsapp] = useState("+91 98765 43210");
  const [email, setEmail] = useState("support@sofiya-bangles.com");
  const [phone, setPhone] = useState("+91 98765 43210");

  const handleSave = () => {
    toast.success("Support contacts updated");
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/settings" className="p-2 rounded-xl hover:bg-[#F5F5F5]"><ArrowLeft className="w-5 h-5" /></Link>
        <div><h1 className="text-2xl font-bold text-[#171717]">Support Contacts</h1><p className="text-[#737373] text-sm">Manage WhatsApp, Email & Phone</p></div>
      </div>
      <div className="bg-white rounded-2xl border border-[#E5E5E5] p-6 space-y-4">
        {[
          { icon: MessageCircle, label: "WhatsApp Number", value: whatsapp, set: setWhatsapp, color: "bg-emerald-50 text-emerald-500" },
          { icon: Mail, label: "Support Email", value: email, set: setEmail, color: "bg-blue-50 text-blue-500" },
          { icon: Phone, label: "Phone Number", value: phone, set: setPhone, color: "bg-amber-50 text-amber-500" },
        ].map(item => (
          <div key={item.label}>
            <label className="block text-sm font-medium text-[#525252] mb-1 flex items-center gap-2">
              <div className={`p-1.5 rounded-lg ${item.color}`}><item.icon className="w-4 h-4" /></div>
              {item.label}
            </label>
            <input value={item.value} onChange={e => item.set(e.target.value)} className="w-full px-4 py-2.5 border border-[#E5E5E5] rounded-xl outline-none focus:border-[#E8436E]" />
          </div>
        ))}
        <div className="flex justify-end pt-2">
          <button onClick={handleSave} className="gradient-primary text-white font-semibold py-2.5 px-6 rounded-xl">Save Changes</button>
        </div>
      </div>
    </div>
  );
}
