"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  TrendingUp,
  DollarSign,
  PieChart,
  ShoppingBag,
  Package,
  AlertTriangle,
  Download,
  Calendar,
  Layers,
  Clock,
  ShieldCheck,
} from "lucide-react";
import { type SuperAdminDashboardData } from "@/src/lib/api";
import Link from "next/link";
import { api } from "@/src/lib/api";
import { STRINGS } from "@/src/constants/strings";

export default function SuperAdminDashboard() {
  const [period, setPeriod] = useState<string>("30d");
  const [data, setData] = useState<SuperAdminDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.superAdmin.getDashboard({ period });
      setData(res);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Failed to load super admin dashboard.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, [period]);

  const kpis = data?.kpis;

  return (
    <div className="space-y-6">
      {/* SuperAdmin Banner */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-slate-900 via-rose-950 to-slate-900 rounded-2xl p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 border border-rose-900/40"
      >
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full">
              Super Admin
            </span>
            <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full">
              70/30 Ledger Active
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            {STRINGS.superAdminDashboard.title}
          </h1>
        </div>

        {/* Quick Filter Pills & Exports */}
        <div className="flex flex-col items-start md:items-end gap-2">
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-300 font-medium">Period:</span>
            <div className="flex items-center bg-white/10 backdrop-blur p-1 rounded-xl border border-white/20">
              {[
                { id: "7d", label: STRINGS.superAdminDashboard.period7d },
                { id: "30d", label: STRINGS.superAdminDashboard.period30d },
                { id: "this_year", label: STRINGS.superAdminDashboard.periodThisYear },
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPeriod(p.id)}
                  className={`px-3 py-1 min-h-[36px] rounded-lg text-xs font-semibold transition-all ${
                    period === p.id
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-300 hover:text-white"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <a
            href={api.superAdmin.exportSalesCsvUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 bg-[#E8436E] hover:bg-[#CC3366] text-white px-3.5 py-1.5 min-h-[44px] rounded-xl text-xs font-semibold transition-colors shadow-sm"
          >
            <Download className="w-3.5 h-3.5" /> Export Report (CSV)
          </a>
        </div>
      </motion.div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-xl text-sm font-medium">
          {error}
        </div>
      )}

      {/* KPI Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="h-28 bg-white border border-slate-200 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Gross Sales */}
          <Link href="/dashboard/revenue" className="block focus:outline-none group">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.02 }}
              className="bg-white border border-slate-200 group-hover:border-blue-300 group-hover:shadow-md rounded-2xl p-5 transition-all h-full flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <DollarSign className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  {STRINGS.superAdminDashboard.grossSales}
                </p>
                <p className="text-2xl font-black text-slate-900 group-hover:text-blue-600 transition-colors mt-1">
                  ₹{(kpis?.grossSales || 0).toLocaleString('en-IN')}
                </p>
              </div>
              <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-500">Gross Sales</span>
                <span className="text-blue-600 font-semibold text-[10px] group-hover:underline">
                  {STRINGS.superAdminDashboard.viewLedger}
                </span>
              </div>
            </motion.div>
          </Link>

          {/* SuperAdmin Earnings 30% */}
          <Link href="/dashboard/revenue" className="block focus:outline-none group">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.04 }}
              className="bg-gradient-to-br from-rose-50 to-pink-50 border border-rose-200 group-hover:border-rose-400 group-hover:shadow-md rounded-2xl p-5 transition-all h-full flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-9 h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                    <PieChart className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-bold text-rose-700 bg-rose-100/80 px-2 py-0.5 rounded-full">
                    30% Share
                  </span>
                </div>
                <p className="text-xs font-semibold text-rose-900 uppercase tracking-wider">
                  {STRINGS.superAdminDashboard.superAdminShare}
                </p>
                <p className="text-2xl font-black text-rose-700 mt-1">
                  ₹{(kpis?.superAdminEarnings || 0).toLocaleString('en-IN')}
                </p>
              </div>
              <div className="pt-3 mt-3 border-t border-rose-200/60 flex items-center justify-between">
                <span className="text-[11px] text-rose-700 font-medium">Platform Share</span>
                <span className="font-bold text-[10px] text-rose-700 underline">
                  {STRINGS.superAdminDashboard.viewDetails}
                </span>
              </div>
            </motion.div>
          </Link>

          {/* Admin Share 70% */}
          <Link href="/dashboard/revenue" className="block focus:outline-none group">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.06 }}
              className="bg-white border border-slate-200 group-hover:border-emerald-300 group-hover:shadow-md rounded-2xl p-5 transition-all h-full flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                    70% Share
                  </span>
                </div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  {STRINGS.superAdminDashboard.adminShare}
                </p>
                <p className="text-2xl font-black text-slate-900 group-hover:text-emerald-600 transition-colors mt-1">
                  ₹{(kpis?.adminEarnings || 0).toLocaleString('en-IN')}
                </p>
              </div>
              <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-500">Store Payout</span>
                <span className="text-emerald-600 font-semibold text-[10px] group-hover:underline">
                  {STRINGS.superAdminDashboard.viewLedger}
                </span>
              </div>
            </motion.div>
          </Link>

          {/* Net Sales after Refunds */}
          <Link href="/dashboard/revenue" className="block focus:outline-none group">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 }}
              className="bg-white border border-slate-200 group-hover:border-violet-300 group-hover:shadow-md rounded-2xl p-5 transition-all h-full flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-9 h-9 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  {STRINGS.superAdminDashboard.netSales}
                </p>
                <p className="text-2xl font-black text-slate-900 group-hover:text-violet-600 transition-colors mt-1">
                  ₹{(kpis?.netSales || 0).toLocaleString('en-IN')}
                </p>
              </div>
              <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-500">Net Settlement</span>
                <span className="text-violet-600 font-semibold text-[10px] group-hover:underline">
                  {STRINGS.superAdminDashboard.viewAudit}
                </span>
              </div>
            </motion.div>
          </Link>

          {/* Products Sold */}
          <Link href="/dashboard/orders" className="block focus:outline-none group">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white border border-slate-200 group-hover:border-amber-300 group-hover:shadow-md rounded-2xl p-5 transition-all h-full flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <ShoppingBag className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  {STRINGS.superAdminDashboard.productsSold}
                </p>
                <p className="text-2xl font-black text-slate-900 group-hover:text-amber-600 transition-colors mt-1">
                  {kpis?.productsSold || 0} <span className="text-xs font-semibold text-slate-400">orders</span>
                </p>
              </div>
              <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-500">{kpis?.unitsSold || 0} units</span>
                <span className="text-amber-600 font-semibold text-[10px] group-hover:underline">
                  {STRINGS.superAdminDashboard.ordersAndBills}
                </span>
              </div>
            </motion.div>
          </Link>

          {/* Total Active Catalog */}
          <Link href="/dashboard/products" className="block focus:outline-none group">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12 }}
              className="bg-white border border-slate-200 group-hover:border-indigo-300 group-hover:shadow-md rounded-2xl p-5 transition-all h-full flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Package className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  {STRINGS.superAdminDashboard.activeCatalog}
                </p>
                <p className="text-2xl font-black text-slate-900 group-hover:text-indigo-600 transition-colors mt-1">
                  {kpis?.activeProducts || 0} <span className="text-xs font-semibold text-slate-400">designs</span>
                </p>
              </div>
              <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-500">Active Designs</span>
                <span className="text-indigo-600 font-semibold text-[10px] group-hover:underline">
                  {STRINGS.superAdminDashboard.manageCatalog}
                </span>
              </div>
            </motion.div>
          </Link>

          {/* Pending Orders */}
          <Link href="/dashboard/orders" className="block focus:outline-none group">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.14 }}
              className="bg-white border border-slate-200 group-hover:border-sky-300 group-hover:shadow-md rounded-2xl p-5 transition-all h-full flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Clock className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  {STRINGS.superAdminDashboard.pendingOrders}
                </p>
                <p className="text-2xl font-black text-slate-900 group-hover:text-sky-600 transition-colors mt-1">
                  {kpis?.pendingOrders || 0} <span className="text-xs font-semibold text-slate-400">orders</span>
                </p>
              </div>
              <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-500">Awaiting Delivery</span>
                <span className="text-sky-600 font-semibold text-[10px] group-hover:underline">
                  {STRINGS.superAdminDashboard.dispatchOrders}
                </span>
              </div>
            </motion.div>
          </Link>

          {/* Low Stock Alerts */}
          <Link href="/dashboard/products" className="block focus:outline-none group">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.16 }}
              className="bg-white border border-amber-200 group-hover:border-amber-400 group-hover:shadow-md rounded-2xl p-5 transition-all h-full flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-xs font-bold text-amber-800 uppercase tracking-wider">
                  {STRINGS.superAdminDashboard.lowStockAlert}
                </p>
                <p className="text-2xl font-black text-amber-700 mt-1">
                  {kpis?.lowStockCount || 0} <span className="text-xs font-semibold text-amber-600">designs</span>
                </p>
              </div>
              <div className="pt-3 mt-3 border-t border-amber-200/60 flex items-center justify-between">
                <span className="text-[11px] text-amber-700 font-medium">Low Stock</span>
                <span className="font-bold text-[10px] text-amber-700 underline">
                  {STRINGS.superAdminDashboard.restockAlert}
                </span>
              </div>
            </motion.div>
          </Link>
        </div>
      )}

      {/* Recent Sales List (Full Width) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {STRINGS.superAdminDashboard.recentSalesTitle}
            </h2>
            <p className="text-xs text-slate-500">
              Live customer orders with automated 70% Store / 30% Platform split
            </p>
          </div>
          <Link href="/dashboard/revenue" className="text-xs font-semibold text-rose-600 hover:text-rose-700">
            {STRINGS.superAdminDashboard.viewSalesLedgerBtn}
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 font-semibold uppercase text-[11px]">
                <th className="pb-3">Order Number</th>
                <th className="pb-3">Customer</th>
                <th className="pb-3">Gross Total (₹)</th>
                <th className="pb-3 text-emerald-600">Store Payout 70% (₹)</th>
                <th className="pb-3 text-rose-600">Platform Share 30% (₹)</th>
                <th className="pb-3 text-right">Audit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(!data?.recentSales || data.recentSales.length === 0) ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-slate-400">
                    {STRINGS.superAdminDashboard.noRecentSales}
                  </td>
                </tr>
              ) : (
                data.recentSales.map((s) => (
                  <tr key={s.order_id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 font-bold text-slate-900">{s.order_number}</td>
                    <td className="py-3 text-slate-600">{s.customer_name || "Customer"}</td>
                    <td className="py-3 font-semibold text-slate-900">₹{s.total_amount.toLocaleString('en-IN')}</td>
                    <td className="py-3 text-emerald-600 font-medium">₹{s.admin_share.toLocaleString('en-IN')}</td>
                    <td className="py-3 text-rose-600 font-bold">₹{s.super_admin_share.toLocaleString('en-IN')}</td>
                    <td className="py-3 text-right">
                      <Link
                        href={`/dashboard/sales/${s.order_id}`}
                        className="text-[#E8436E] hover:text-[#CC3366] font-semibold hover:underline"
                      >
                        View Bill
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
