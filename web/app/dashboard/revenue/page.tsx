"use client";

import { useState, useEffect } from "react";
import { type RevenueLedgerItem } from "@/src/lib/api";
import { useAuth } from "@/features/auth/lib/auth-context";
import {
  TrendingUp,
  Download,
  Filter,
  Search,
  Package,
  ArrowUpRight,
  Shield,
  Clock,
  Settings,
} from "lucide-react";
import Link from "next/link";
import { api } from "@/src/lib/api";

export default function ProductSalesRevenuePage() {
  const { user, isLoading: authLoading } = useAuth();
  const [items, setItems] = useState<RevenueLedgerItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [transactionType, setTransactionType] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [commissionSettings, setCommissionSettings] = useState({
    admin_percentage: 70,
    super_admin_percentage: 30,
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [res, settings] = await Promise.all([
        api.superAdmin.getRevenueLedger({
          page,
          limit: 30,
          transactionType: transactionType || undefined,
        }),
        api.superAdmin.getCommissionSettings().catch(() => null),
      ]);

      setItems(res.items || []);
      setTotal(res.total || 0);
      if (settings) {
        setCommissionSettings({
          admin_percentage: settings.admin_percentage ?? 70,
          super_admin_percentage: settings.super_admin_percentage ?? 30,
        });
      }
    } catch (error) {
      console.error("Failed to load product sales revenue ledger:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === "super_admin") {
      fetchData();
    }
  }, [page, transactionType, user]);

  if (!authLoading && user && user.role !== "super_admin") {
    return (
      <div className="bg-white border border-rose-200 rounded-2xl p-8 text-center max-w-lg mx-auto mt-10 shadow-sm">
        <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Shield className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900 mb-2">SuperAdmin Access Required</h2>
        <p className="text-xs text-slate-500 mb-6">
          Accessing the 70/30 Profit Split & Commission Ledger is restricted to Super-Administrators.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 bg-[#E8436E] text-white px-5 py-2.5 rounded-xl text-xs font-bold hover:bg-[#CC3366] transition-colors"
        >
          Return to Store Dashboard
        </Link>
      </div>
    );
  }

  // Aggregate stats across current items
  const totalGross = items.reduce((acc: number, i: RevenueLedgerItem) => acc + (i.gross_amount || 0), 0);
  const totalAdminShare = items.reduce((acc: number, i: RevenueLedgerItem) => acc + (i.admin_share_amount || 0), 0);
  const totalSuperAdminShare = items.reduce(
    (acc: number, i: RevenueLedgerItem) => acc + (i.super_admin_share_amount || 0),
    0
  );

  // Client filtering by search query
  const filteredItems = items.filter((item: RevenueLedgerItem) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const nameMatch = (item.product_name || "").toLowerCase().includes(q);
    const orderMatch = (item.order_id || "").toLowerCase().includes(q);
    const adminMatch = (item.admin_name || "").toLowerCase().includes(q);
    return nameMatch || orderMatch || adminMatch;
  });

  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-[#E8436E]" /> Product Sales & Commission Ledger
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Detailed record of which products sold at what rate, and the exact {commissionSettings.admin_percentage}% Admin vs {commissionSettings.super_admin_percentage}% Super-Admin profit allocation.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/settings/commission"
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <Settings className="w-4 h-4 text-slate-500" /> Adjust Split Ratio
          </Link>

          <a
            href={api.superAdmin.exportRevenueCsvUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-[#E8436E] hover:bg-[#CC3366] text-white px-4 py-2.5 rounded-xl text-xs font-semibold shadow-sm transition-all"
          >
            <Download className="w-4 h-4" /> Export CSV
          </a>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Gross Sales */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <p className="text-xs font-semibold text-slate-500">Gross Products Sold</p>
          <p className="text-2xl font-bold text-slate-900">₹{totalGross.toLocaleString()}</p>
          <p className="text-[11px] text-slate-400">Total sale volume from orders</p>
        </div>

        {/* Admin Share */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500">Admin Share Payout</p>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
              {commissionSettings.admin_percentage}%
            </span>
          </div>
          <p className="text-2xl font-bold text-emerald-600">₹{totalAdminShare.toLocaleString()}</p>
          <p className="text-[11px] text-slate-400">Allocated to product sellers</p>
        </div>

        {/* SuperAdmin Share */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500">Super-Admin Platform Share</p>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-100 text-[#E8436E]">
              {commissionSettings.super_admin_percentage}%
            </span>
          </div>
          <p className="text-2xl font-bold text-[#E8436E]">
            ₹{totalSuperAdminShare.toLocaleString()}
          </p>
          <p className="text-[11px] text-slate-400">Platform operational commission</p>
        </div>

        {/* Split Rule */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <p className="text-xs font-semibold text-slate-500">Commission Rule</p>
          <p className="text-2xl font-bold text-slate-900">
            {commissionSettings.admin_percentage} / {commissionSettings.super_admin_percentage}
          </p>
          <p className="text-[11px] text-slate-400">Admin 70% • SuperAdmin 30%</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search product name, order ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#E8436E]"
          />
        </div>

        {/* Transaction Type Filter */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold">
            <Filter className="w-4 h-4 text-slate-400" /> Type:
          </div>
          <select
            value={transactionType}
            onChange={(e) => {
              setTransactionType(e.target.value);
              setPage(1);
            }}
            className="text-xs border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-700 focus:outline-none focus:border-[#E8436E] font-medium"
          >
            <option value="">All Transactions</option>
            <option value="SALE">SALE</option>
            <option value="REFUND">REFUND</option>
          </select>
          <span className="text-xs text-slate-400 font-medium">({total} Records)</span>
        </div>
      </div>

      {/* Product Sales Ledger Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs">Loading product sales ledger...</div>
        ) : filteredItems.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs font-medium">
            No sales records found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-bold">
                <tr>
                  <th className="p-4">Product Sold</th>
                  <th className="p-4">Sold Rate</th>
                  <th className="p-4">Qty</th>
                  <th className="p-4">Gross Total</th>
                  <th className="p-4 text-emerald-700">Admin Share ({commissionSettings.admin_percentage}%)</th>
                  <th className="p-4 text-[#E8436E]">Super-Admin ({commissionSettings.super_admin_percentage}%)</th>
                  <th className="p-4">Order ID & Date</th>
                  <th className="p-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredItems.map((item: RevenueLedgerItem) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Product Name */}
                    <td className="p-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-rose-50 text-[#E8436E] flex items-center justify-center shrink-0">
                          <Package className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 leading-tight">
                            {item.product_name || "Bangles Set"}
                          </p>
                          <p className="text-[11px] text-slate-400">ID: {item.product_id}</p>
                        </div>
                      </div>
                    </td>

                    {/* Admin Vendor */}
                    <td className="p-4">
                      <span className="font-semibold text-slate-800">{item.admin_name || "Store Admin"}</span>
                    </td>

                    {/* Unit Price (Sale Rate) */}
                    <td className="p-4 text-slate-900 font-bold">₹{item.sale_rate ?? (item.gross_amount / (item.quantity || 1))}</td>

                    {/* Quantity Sold */}
                    <td className="p-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
                        {item.quantity}
                      </span>
                    </td>

                    {/* Gross Revenue */}
                    <td className="p-4 text-slate-900 font-extrabold text-sm">₹{item.gross_amount}</td>

                    {/* Admin Share (70%) */}
                    <td className="p-4">
                      <p className="text-emerald-700 font-extrabold">₹{item.admin_share_amount}</p>
                      <p className="text-[10px] text-emerald-600 font-medium">
                        ({item.admin_share_percentage ?? commissionSettings.admin_percentage}%)
                      </p>
                    </td>

                    {/* Super-Admin Share (30%) */}
                    <td className="p-4">
                      <p className="text-[#E8436E] font-black">
                        ₹{item.super_admin_share_amount}
                      </p>
                      <p className="text-[10px] text-rose-500 font-medium">
                        ({item.super_admin_share_percentage ?? commissionSettings.super_admin_percentage}%)
                      </p>
                    </td>

                    {/* Order ID & Date */}
                    <td className="p-4 text-[11px] text-slate-500">
                      <p className="font-semibold text-slate-700">#{item.order_id?.slice(-8) || "N/A"}</p>
                      <p className="flex items-center gap-1 text-[10px] text-slate-400 mt-0.5">
                        <Clock className="w-3 h-3" />
                        {item.created_at ? new Date(item.created_at).toLocaleDateString("en-IN") : "Just now"}
                      </p>
                    </td>

                    {/* Status Badge */}
                    <td className="p-4">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {item.status || "COMPLETED"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        <div className="p-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>Page {page} of {Math.ceil(total / 30) || 1}</span>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p: number) => p - 1)}
              className="px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 font-semibold"
            >
              Previous
            </button>
            <button
              disabled={page * 30 >= total}
              onClick={() => setPage((p: number) => p + 1)}
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
