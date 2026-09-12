"use client";

import { motion } from "framer-motion";
import { User, Store, ChevronRight, Shield, Settings } from "lucide-react";
import Link from "next/link";

import { useAuth } from "@/features/auth/lib/auth-context";

interface SettingItem {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  desc: string;
  color: string;
  href: string;
  badge?: string;
}

const baseSettingsItems: SettingItem[] = [
  { icon: User, label: "My Profile", desc: "Manage profile picture, name & contact info", color: "bg-purple-50 text-purple-600", href: "/dashboard/settings/profile" },
  { icon: Store, label: "Store Profile", desc: "Edit name, description, location & hours", color: "bg-indigo-50 text-indigo-600", href: "/dashboard/settings/store-profile" },
  { icon: Shield, label: "Account Security & 2FA", desc: "Review 2-step verification, password & active sessions", color: "bg-emerald-50 text-emerald-600", href: "/dashboard/settings/security" },
];

export default function SettingsPage() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === "super_admin";

  const items: SettingItem[] = isSuperAdmin
    ? [
        ...baseSettingsItems,
        {
          icon: Settings,
          label: "70/30 Platform Commission Split",
          desc: "Configure profit allocation ratio between Admins and SuperAdmin",
          color: "bg-rose-50 text-[#E8436E]",
          href: "/dashboard/settings/commission",
          badge: "SuperAdmin Only",
        },
      ]
    : baseSettingsItems;

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#171717]">Settings & Preferences</h1>
        <p className="text-[#737373] mt-1 text-sm">
          Manage your account, platform commission rules, and store configuration
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((item, i) => (
          <motion.div key={item.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Link href={item.href} className="bg-white rounded-2xl border border-[#E5E5E5] p-5 flex items-start gap-4 hover:shadow-md hover:border-rose-200 transition-all group h-full">
              <div className={`w-12 h-12 rounded-xl ${item.color} flex items-center justify-center shrink-0`}>
                <item.icon className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-bold text-sm text-[#171717] group-hover:text-[#E8436E] transition-colors">{item.label}</p>
                  {item.badge && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-[#E8436E]">
                      {item.badge}
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#737373] mt-1 leading-relaxed">{item.desc}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-[#A3A3A3] group-hover:text-[#E8436E] group-hover:translate-x-0.5 transition-all shrink-0 mt-0.5" />
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
