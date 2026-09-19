"use client";

import { useState, useEffect } from "react";
import { ShoppingBag, Search, Download, Filter, Eye } from "lucide-react";
import Link from "next/link";
import { api } from "@/src/lib/api";
import { STRINGS } from "@/src/constants/strings";

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
            <ShoppingBag className="w-6 h-6 text-rose-600" /> {STRINGS.salesManagement.title}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {STRINGS.salesManagement.subtitle}
          </p>
        </div>

        <a
          href={api.superAdmin.exportSalesCsvUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 min-h-[44px] rounded-xl text-xs font-semibold transition-colors"
        >
          <Download className="w-4 h-4" /> {STRINGS.salesManagement.exportCsv}
        </a>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 justify-between items-center">
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={STRINGS.salesManagement.searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 min-h-[44px] text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-rose-500"
          />
        </form>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold">
            <Filter className="w-4 h-4 text-slate-400" /> {STRINGS.salesManagement.statusLabel}
          </div>
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            className="text-xs border border-slate-200 rounded-xl px-3 py-2.5 min-h-[44px] bg-white text-slate-700 focus:outline-none focus:border-rose-500 font-medium"
          >
            <option value="">{STRINGS.salesManagement.allStatuses}</option>
            <option value="pending">{STRINGS.salesManagement.statusPending}</option>
            <option value="processing">{STRINGS.salesManagement.statusProcessing}</option>
            <option value="confirmed">{STRINGS.salesManagement.statusConfirmed}</option>
            <option value="completed">{STRINGS.salesManagement.statusCompleted}</option>
            <option value="returned">{STRINGS.salesManagement.statusReturned}</option>
          </select>
        </div>
      </div>

      {/* Sales Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-400 text-sm">{STRINGS.salesManagement.loading}</div>
        ) : sales.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm font-medium">{STRINGS.salesManagement.empty}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-bold">
                <tr>
                  <th className="p-4">{STRINGS.salesManagement.tableOrderNumber}</th>
                  <th className="p-4">{STRINGS.salesManagement.tableDate}</th>
                  <th className="p-4">{STRINGS.salesManagement.tableCustomer}</th>
                  <th className="p-4">Items Count</th>
                  <th className="p-4">{STRINGS.salesManagement.tableTotal}</th>
                  <th className="p-4 text-emerald-600">{STRINGS.salesManagement.tableAdminShare}</th>
                  <th className="p-4 text-rose-600">{STRINGS.salesManagement.tableSuperAdminShare}</th>
                  <th className="p-4">{STRINGS.salesManagement.tableStatus}</th>
                  <th className="p-4 text-right">{STRINGS.salesManagement.tableAction}</th>
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
                        className="inline-flex items-center gap-1 text-[#E8436E] hover:text-[#CC3366] font-bold px-2 py-1 min-h-[36px] rounded-lg hover:bg-rose-50"
                      >
                        <Eye className="w-3.5 h-3.5" /> {STRINGS.salesManagement.actionDetails}
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
              className="px-3 py-2 min-h-[44px] border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 font-semibold"
            >
              Previous
            </button>
            <button
              disabled={page * 15 >= total}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-2 min-h-[44px] border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 font-semibold"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
