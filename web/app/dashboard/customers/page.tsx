"use client";

import { useState, useEffect } from "react";
import {
  Users,
  Search,
  Mail,
  Phone,
  Calendar,
  Shield,
  ShoppingBag,
  AlertCircle,
  Eye,
} from "lucide-react";
import { superAdminApi, type UserProfile } from "@/src/lib/api";
import toast from "react-hot-toast";

export default function CustomersDirectoryPage() {
  const [customers, setCustomers] = useState<UserProfile[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedCustomer, setSelectedCustomer] = useState<UserProfile | null>(null);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const res = await superAdminApi.getCustomers({
        page,
        limit: 20,
        search: search.trim() || undefined,
      });
      setCustomers(res.customers || []);
      setTotal(res.total || 0);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to load customer directory");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [page]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchCustomers();
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-[#E8436E]" /> Customer Directory
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Registered customers on the Sofiya Bangles mobile app and web platform.
          </p>
        </div>
        <span className="text-xs font-semibold px-3.5 py-1.5 bg-slate-100 text-slate-700 rounded-xl self-start sm:self-auto">
          Total Customers: {total}
        </span>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search customers by full name, email, or phone number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#E8436E]"
            />
          </div>
          <button
            type="submit"
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition-colors"
          >
            Search
          </button>
        </form>
      </div>

      {/* Customers Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            <div className="w-8 h-8 border-4 border-[#E8436E] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            Loading customer accounts...
          </div>
        ) : customers.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            <AlertCircle className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            No registered customers found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold text-[10px] tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Customer</th>
                  <th className="px-5 py-3.5">Contact Email</th>
                  <th className="px-5 py-3.5">Phone</th>
                  <th className="px-5 py-3.5">Member Since</th>
                  <th className="px-5 py-3.5">Account Role</th>
                  <th className="px-5 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {customers.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-rose-100 to-rose-200 text-[#E8436E] flex items-center justify-center font-bold text-xs">
                          {c.full_name?.charAt(0)?.toUpperCase() || "C"}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900">{c.full_name || "Guest Customer"}</div>
                          <div className="text-[10px] text-slate-400 font-mono">ID: {c.id.substring(0, 10)}...</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        <span>{c.email || "No email"}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span>{c.phone || "—"}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-slate-500 whitespace-nowrap">
                      {c.created_at ? new Date(c.created_at).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                        Customer
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() => setSelectedCustomer(c)}
                        className="p-1.5 text-slate-500 hover:text-[#E8436E] hover:bg-rose-50 rounded-lg transition-colors inline-flex items-center gap-1 text-xs font-semibold"
                      >
                        <Eye className="w-3.5 h-3.5" /> Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Customer Details Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#E8436E] to-[#CC3366] text-white flex items-center justify-center font-bold text-lg">
                  {selectedCustomer.full_name?.charAt(0)?.toUpperCase() || "C"}
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">{selectedCustomer.full_name}</h2>
                  <p className="text-xs text-slate-400">Customer Profile</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedCustomer(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl bg-slate-100 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                <span className="text-slate-400 font-semibold text-[10px] uppercase">User ID</span>
                <p className="font-mono text-slate-800 break-all">{selectedCustomer.id}</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                <span className="text-slate-400 font-semibold text-[10px] uppercase">Email</span>
                <p className="text-slate-800">{selectedCustomer.email || "Not provided"}</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                <span className="text-slate-400 font-semibold text-[10px] uppercase">Phone</span>
                <p className="text-slate-800">{selectedCustomer.phone || "Not provided"}</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                <span className="text-slate-400 font-semibold text-[10px] uppercase">Registration Date</span>
                <p className="text-slate-800">
                  {selectedCustomer.created_at ? new Date(selectedCustomer.created_at).toLocaleString() : "Unknown"}
                </p>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedCustomer(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
