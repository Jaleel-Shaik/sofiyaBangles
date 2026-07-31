"use client";

import { motion } from "framer-motion";
import { User, Store, ChevronRight } from "lucide-react";
import Link from "next/link";

const settingsItems = [
  { icon: User, label: "My Profile", desc: "Manage profile picture & personal info", color: "bg-purple-50 text-purple-500", href: "/dashboard/settings/profile" },
  { icon: Store, label: "Store Profile", desc: "Edit name, description, location & hours", color: "bg-indigo-50 text-indigo-500", href: "/dashboard/settings/store-profile" },
];

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#171717]">Settings</h1>
        <p className="text-[#737373] mt-1">Manage your admin dashboard preferences</p>
      </div>

      <div className="grid gap-3">
        {settingsItems.map((item, i) => (
          <motion.div key={item.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Link href={item.href} className="bg-white rounded-2xl border border-[#E5E5E5] p-4 flex items-center gap-4 hover:shadow-md transition-all group">
              <div className={`w-12 h-12 rounded-xl ${item.color} flex items-center justify-center`}>
                <item.icon className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-[#171717]">{item.label}</p>
                <p className="text-xs text-[#A3A3A3]">{item.desc}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-[#A3A3A3] group-hover:text-[#E8436E] transition-colors" />
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
