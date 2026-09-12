"use client";

import { useState, useEffect } from "react";
import { ShoppingBag, Search, Download, Filter, Eye } from "lucide-react";
import Link from "next/link";
import { api } from "@/src/lib/api";

export default function SalesPage() {
  const [sales, setSales] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchSales = async () => {
    setLoading(true);
    try {
      const res = await api.superAdmin.getSalesList({ page, limit: 15, status: status || undefined, search: search || undefined });
      setSales(res.sales || []);
      setTotal(res.total || 0);
    } catch (error) {
      console.error("Failed to fetch sales list:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSales();
  }, [page, status]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchSales();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <ShoppingBag className="w-6 h-6 text-rose-600" /> Sales & Orders Management
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Complete list of all store sales with real-time 70/30 commission allocation breakdown.
          </p>
        </div>

        <a
          href={api.superAdmin.exportSalesCsvUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 rounded-xl text-xs font-semibold transition-colors"
        >
          <Download className="w-4 h-4" /> Export CSV
        </a>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 justify-between items-center">
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by order number or customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-rose-500"
          />
        </form>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold">
            <Filter className="w-4 h-4 text-slate-400" /> Status:
          </div>
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            className="text-xs border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-700 focus:outline-none focus:border-rose-500 font-medium"
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="confirmed">Confirmed</option>
            <option value="completed">Completed</option>
            <option value="returned">Returned / Refunded</option>
          </select>
        </div>
      </div>

      {/* Sales Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-400 text-sm">Loading sales data...</div>
        ) : sales.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm font-medium">No sales records found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-bold">
                <tr>
                  <th className="p-4">Order Number</th>
                  <th className="p-4">Date</th>
                  <th className="p-4">Customer</th>
                  <th className="p-4">Items Count</th>
                  <th className="p-4">Total Amount</th>
                  <th className="p-4 text-emerald-600">Admin Share (70%)</th>
                  <th className="p-4 text-rose-600">SuperAdmin Share (30%)</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {sales.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-4 font-bold text-slate-900">{s.order_number}</td>
                    <td className="p-4 text-slate-500">{new Date(s.created_at).toLocaleDateString()}</td>
                    <td className="p-4 text-slate-800">{s.shipping_address_snapshot?.name || "Customer"}</td>
                    <td className="p-4">{s.items?.length || 1} item(s)</td>
                    <td className="p-4 font-bold text-slate-900">₹{s.total_amount}</td>
                    <td className="p-4 text-emerald-600 font-bold">₹{s.admin_share || 0}</td>
                    <td className="p-4 text-rose-600 font-bold">₹{s.super_admin_share || 0}</td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                        s.status === "completed" ? "bg-emerald-100 text-emerald-800" :
                        s.status === "pending" ? "bg-amber-100 text-amber-800" :
                        s.payment_status === "refunded" || s.status === "returned" ? "bg-rose-100 text-rose-800" :
                        "bg-slate-100 text-slate-700"
                      }`}>
                        {s.payment_status === "refunded" ? "Refunded" : s.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <Link
                        href={`/dashboard/sales/${s.id}`}
                        className="inline-flex items-center gap-1 text-[#E8436E] hover:text-[#CC3366] font-bold"
                      >
                        <Eye className="w-3.5 h-3.5" /> Detail
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        <div className="p-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>Showing page {page} ({total} total sales)</span>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 font-semibold"
            >
              Previous
            </button>
            <button
              disabled={page * 15 >= total}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 font-semibold"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
