"use client";

import { useState } from "react";
import { ArrowLeft, Bell, BellRing, BellOff } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

export default function OrderAlertsPage() {
  const [settings, setSettings] = useState({
    newOrders: true,
    orderUpdates: true,
    lowStock: true,
    customerMessages: false,
    dailySummary: true,
  });

  const toggle = (key: keyof typeof settings) => {
    setSettings(s => ({ ...s, [key]: !s[key] }));
  };

  const alerts = [
    { key: "newOrders" as const, label: "New Orders", desc: "Get notified when a new order is placed", icon: BellRing },
    { key: "orderUpdates" as const, label: "Order Updates", desc: "Status changes and shipping updates", icon: Bell },
    { key: "lowStock" as const, label: "Low Stock Alerts", desc: "Products running low on inventory", icon: Bell },
    { key: "customerMessages" as const, label: "Customer Messages", desc: "When customers send inquiries", icon: Bell },
    { key: "dailySummary" as const, label: "Daily Summary", desc: "End-of-day order summary report", icon: BellRing },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/settings" className="p-2 rounded-xl hover:bg-[#F5F5F5]"><ArrowLeft className="w-5 h-5" /></Link>
        <div><h1 className="text-2xl font-bold text-[#171717]">Order Alerts</h1><p className="text-[#737373] text-sm">Push notification preferences</p></div>
      </div>
      <div className="bg-white rounded-2xl border border-[#E5E5E5] divide-y divide-[#E5E5E5]">
        {alerts.map(item => (
          <div key={item.key} className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl ${settings[item.key] ? "bg-amber-50 text-amber-500" : "bg-[#F5F5F5] text-[#A3A3A3]"}`}>
                {settings[item.key] ? <item.icon className="w-5 h-5" /> : <BellOff className="w-5 h-5" />}
              </div>
              <div>
                <p className="font-medium text-[#171717] text-sm">{item.label}</p>
                <p className="text-xs text-[#A3A3A3]">{item.desc}</p>
              </div>
            </div>
            <button onClick={() => toggle(item.key)} className={`relative w-11 h-6 rounded-full transition-colors ${settings[item.key] ? "bg-[#E8436E]" : "bg-[#D4D4D4]"}`}>
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${settings[item.key] ? "translate-x-5" : ""}`} />
            </button>
          </div>
        ))}
      </div>
      <div className="flex justify-end">
        <button onClick={() => { toast.success("Alert preferences saved"); }} className="gradient-primary text-white font-semibold py-2.5 px-6 rounded-xl">Save Preferences</button>
      </div>
    </div>
  );
}
