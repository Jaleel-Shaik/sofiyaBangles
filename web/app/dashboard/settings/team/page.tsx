"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Users, Mail, Shield, Loader2 } from "lucide-react";
import Link from "next/link";
import { adminApi, type UserProfile } from "@/src/lib/api";

export default function TeamManagementPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.getUsers().then(d => setUsers(d)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/settings" className="p-2 rounded-xl hover:bg-[#F5F5F5]"><ArrowLeft className="w-5 h-5" /></Link>
        <div><h1 className="text-2xl font-bold text-[#171717]">Team Management</h1><p className="text-[#737373] text-sm">Manage admin access and users</p></div>
      </div>
      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-[#E8436E]" /></div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#E5E5E5] divide-y divide-[#E5E5E5]">
          {users.map(user => (
            <div key={user.id} className="p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#E8436E] to-[#CC3366] flex items-center justify-center text-white text-sm font-semibold">
                {user.full_name?.charAt(0) || "U"}
              </div>
              <div className="flex-1">
                <p className="font-medium text-[#171717]">{user.full_name}</p>
                <p className="text-xs text-[#A3A3A3] flex items-center gap-1"><Mail className="w-3 h-3" />{user.email}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${user.role === "admin" || user.role === "super_admin" ? "bg-rose-50 text-[#E8436E]" : "bg-[#F5F5F5] text-[#64748B]"}`}>
                {user.role}
              </span>
            </div>
          ))}
          {users.length === 0 && (
            <div className="p-10 text-center text-[#A3A3A3]"><Users className="w-12 h-12 mx-auto mb-3 opacity-50" /><p>No users found</p></div>
          )}
        </div>
      )}
    </div>
  );
}
