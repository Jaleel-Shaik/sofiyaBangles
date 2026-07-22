"use client";

import { useState } from "react";
import { ArrowLeft, MapPin, Navigation } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

export default function LocationPage() {
  const [address, setAddress] = useState("123, Jewelry Market, Main Street");
  const [city, setCity] = useState("Mumbai");
  const [state, setState] = useState("Maharashtra");
  const [pincode, setPincode] = useState("400001");

  const handleSave = () => {
    toast.success("Location updated");
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/settings" className="p-2 rounded-xl hover:bg-[#F5F5F5]"><ArrowLeft className="w-5 h-5" /></Link>
        <div><h1 className="text-2xl font-bold text-[#171717]">Store Location</h1><p className="text-[#737373] text-sm">Update your physical address</p></div>
      </div>
      <div className="bg-white rounded-2xl border border-[#E5E5E5] p-6 space-y-4">
        <div className="flex items-center gap-3 mb-2"><MapPin className="w-5 h-5 text-rose-500" /><span className="font-semibold text-[#171717]">Address Details</span></div>
        {[
          { label: "Street Address", value: address, set: setAddress },
          { label: "City", value: city, set: setCity },
          { label: "State", value: state, set: setState },
          { label: "Pincode", value: pincode, set: setPincode },
        ].map(field => (
          <div key={field.label}>
            <label className="block text-sm font-medium text-[#525252] mb-1">{field.label}</label>
            <input value={field.value} onChange={e => field.set(e.target.value)} className="w-full px-4 py-2.5 border border-[#E5E5E5] rounded-xl outline-none focus:border-[#E8436E]" />
          </div>
        ))}
        <div className="flex justify-end pt-2">
          <button onClick={handleSave} className="gradient-primary text-white font-semibold py-2.5 px-6 rounded-xl">Save Changes</button>
        </div>
      </div>
    </div>
  );
}
