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
  ArrowRight,
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
              ROLE: PLATFORM SUPER ADMIN (EXECUTIVE FINANCIAL VIEW)
            </span>
            <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full">
              70% Store / 30% Platform Split Active
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            {STRINGS.superAdminDashboard.title}
          </h1>
          <p className="text-slate-300 text-xs md:text-sm mt-1">
            Consolidated Financial Analytics, 70/30 Profit Allocation Ledger, Multi-Branch Operations & Settlement Summary
          </p>
        </div>

        {/* Quick Filter Pills & Exports */}
        <div className="flex flex-col items-start md:items-end gap-2">
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-300 font-medium">Reporting Horizon:</span>
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
            <Download className="w-3.5 h-3.5" /> Export Financial Report (CSV)
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
              className="bg-white border border-slate-200 group-hover:border-blue-300 group-hover:shadow-md rounded-2xl p-5 transition-all h-full"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider bg-blue-50 px-2 py-0.5 rounded">
                  [REVENUE GMV]
                </span>
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                {STRINGS.superAdminDashboard.grossSales}
              </p>
              <p className="text-2xl font-black text-slate-900 group-hover:text-blue-600 transition-colors mt-1">
                ₹{(kpis?.grossSales || 0).toLocaleString('en-IN')}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                Total customer payments before commission splits
              </p>
              <div className="pt-2 mt-2 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-500">{STRINGS.superAdminDashboard.grossSalesDesc}</span>
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
              className="bg-gradient-to-br from-rose-50 to-pink-50 border border-rose-200 group-hover:border-rose-400 group-hover:shadow-md rounded-2xl p-5 transition-all h-full"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider bg-rose-100/80 px-2 py-0.5 rounded">
                  [PLATFORM SHARE 30%]
                </span>
                <div className="w-8 h-8 rounded-lg bg-rose-600 text-white flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                  <PieChart className="w-4 h-4" />
                </div>
              </div>
              <p className="text-xs font-semibold text-rose-900 uppercase tracking-wider">
                {STRINGS.superAdminDashboard.superAdminShare}
              </p>
              <p className="text-2xl font-black text-rose-700 mt-1">
                ₹{(kpis?.superAdminEarnings || 0).toLocaleString('en-IN')}
              </p>
              <p className="text-[11px] text-rose-600/80 mt-1">
                30% platform margin retained from completed orders
              </p>
              <div className="pt-2 mt-2 border-t border-rose-200/60 flex items-center justify-between">
                <span className="text-[11px] text-rose-700 font-medium">{STRINGS.superAdminDashboard.platformRevenueDesc}</span>
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
              className="bg-white border border-slate-200 group-hover:border-emerald-300 group-hover:shadow-md rounded-2xl p-5 transition-all h-full"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider bg-emerald-50 px-2 py-0.5 rounded">
                  [STORE PAYOUT 70%]
                </span>
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                {STRINGS.superAdminDashboard.adminShare}
              </p>
              <p className="text-2xl font-black text-slate-900 group-hover:text-emerald-600 transition-colors mt-1">
                ₹{(kpis?.adminEarnings || 0).toLocaleString('en-IN')}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                70% merchant share payable to store vendors
              </p>
              <div className="pt-2 mt-2 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-500">{STRINGS.superAdminDashboard.adminPayoutsDesc}</span>
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
              className="bg-white border border-slate-200 group-hover:border-violet-300 group-hover:shadow-md rounded-2xl p-5 transition-all h-full"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-violet-700 uppercase tracking-wider bg-violet-50 px-2 py-0.5 rounded">
                  [NET SETTLEMENT]
                </span>
                <div className="w-8 h-8 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <ShieldCheck className="w-4 h-4" />
                </div>
              </div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                {STRINGS.superAdminDashboard.netSales}
              </p>
              <p className="text-2xl font-black text-slate-900 group-hover:text-violet-600 transition-colors mt-1">
                ₹{(kpis?.netSales || 0).toLocaleString('en-IN')}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                Gross sales minus customer refunds & returns
              </p>
              <div className="pt-2 mt-2 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-500">{STRINGS.superAdminDashboard.refundsPrefix(kpis?.totalRefunds || 0)}</span>
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
              className="bg-white border border-slate-200 group-hover:border-amber-300 group-hover:shadow-md rounded-2xl p-5 transition-all h-full"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider bg-amber-50 px-2 py-0.5 rounded">
                  [SALES VOLUME]
                </span>
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <ShoppingBag className="w-4 h-4" />
                </div>
              </div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                {STRINGS.superAdminDashboard.productsSold}
              </p>
              <p className="text-2xl font-black text-slate-900 group-hover:text-amber-600 transition-colors mt-1">
                {kpis?.productsSold || 0} <span className="text-xs font-semibold text-slate-400">orders</span>
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                {kpis?.unitsSold || 0} total units sold across store catalog
              </p>
              <div className="pt-2 mt-2 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-500">{STRINGS.superAdminDashboard.unitsSoldPrefix(kpis?.unitsSold || 0)}</span>
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
              className="bg-white border border-slate-200 group-hover:border-indigo-300 group-hover:shadow-md rounded-2xl p-5 transition-all h-full"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider bg-indigo-50 px-2 py-0.5 rounded">
                  [CATALOG BREADTH]
                </span>
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Package className="w-4 h-4" />
                </div>
              </div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                {STRINGS.superAdminDashboard.activeCatalog}
              </p>
              <p className="text-2xl font-black text-slate-900 group-hover:text-indigo-600 transition-colors mt-1">
                {kpis?.activeProducts || 0} <span className="text-xs font-semibold text-slate-400">designs</span>
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                Live bangle designs visible to customers on mobile
              </p>
              <div className="pt-2 mt-2 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-500">{STRINGS.superAdminDashboard.totalCatalogPrefix(kpis?.totalProducts || 0)}</span>
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
              className="bg-white border border-slate-200 group-hover:border-sky-300 group-hover:shadow-md rounded-2xl p-5 transition-all h-full"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-sky-700 uppercase tracking-wider bg-sky-50 px-2 py-0.5 rounded">
                  [ORDER PIPELINE]
                </span>
                <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                {STRINGS.superAdminDashboard.pendingOrders}
              </p>
              <p className="text-2xl font-black text-slate-900 group-hover:text-sky-600 transition-colors mt-1">
                {kpis?.pendingOrders || 0} <span className="text-xs font-semibold text-slate-400">orders</span>
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                Awaiting store admin confirmation & invoice issuance
              </p>
              <div className="pt-2 mt-2 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-500">{STRINGS.superAdminDashboard.awaitingFulfillment}</span>
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
              className="bg-white border border-amber-200 group-hover:border-amber-400 group-hover:shadow-md rounded-2xl p-5 transition-all h-full"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider bg-amber-100/70 px-2 py-0.5 rounded">
                  [INVENTORY HEALTH]
                </span>
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <AlertTriangle className="w-4 h-4" />
                </div>
              </div>
              <p className="text-xs font-bold text-amber-800 uppercase tracking-wider">
                {STRINGS.superAdminDashboard.lowStockAlert}
              </p>
              <p className="text-2xl font-black text-amber-700 mt-1">
                {kpis?.lowStockCount || 0} <span className="text-xs font-semibold text-amber-600">designs</span>
              </p>
              <p className="text-[11px] text-amber-600 mt-1">
                Bangle items with ≤ 10 stock units needing restocking
              </p>
              <div className="pt-2 mt-2 border-t border-amber-200/60 flex items-center justify-between">
                <span className="text-[11px] text-amber-700 font-medium">{STRINGS.superAdminDashboard.outOfStockPrefix(kpis?.outOfStockCount || 0)}</span>
                <span className="font-bold text-[10px] text-amber-700 underline">
                  {STRINGS.superAdminDashboard.restockAlert}
                </span>
              </div>
            </motion.div>
          </Link>
        </div>
      )}

      {/* Sales Trend Chart & Top Products */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Trend Chart Container */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                {STRINGS.superAdminDashboard.trendTitle}
              </h2>
              <p className="text-xs text-slate-500">
                {STRINGS.superAdminDashboard.trendSubtitle}
              </p>
            </div>
            <Link
              href="/dashboard/revenue"
              className="text-xs font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-1"
            >
              {STRINGS.superAdminDashboard.viewRevenueLedger} <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold mb-2 px-1">
            <span>Y-Axis: Gross Sales Volume (₹ INR)</span>
            <span>X-Axis: Timeline Date</span>
          </div>

          {!data?.salesTrend || data.salesTrend.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-slate-400 text-sm font-medium">
              {STRINGS.superAdminDashboard.noTrendData}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="h-56 flex items-end gap-2 pt-6 pb-2 border-b border-slate-100">
                {data.salesTrend.map((trend) => {
                  const maxGross = Math.max(...data.salesTrend.map((t) => t.grossSales), 1);
                  const heightPct = Math.min(100, Math.max(10, (trend.grossSales / maxGross) * 100));

                  return (
                    <div key={trend.date} className="flex-1 flex flex-col items-center gap-1 group relative">
                      {/* Tooltip */}
                      <div className="absolute bottom-full mb-2 hidden group-hover:block bg-slate-900 text-white text-[10px] p-2.5 rounded-xl z-20 whitespace-nowrap shadow-xl border border-slate-700">
                        <p className="font-bold text-slate-200">Date: {trend.date}</p>
                        <p className="text-white font-extrabold mt-0.5">Gross Sales: ₹{trend.grossSales.toLocaleString('en-IN')}</p>
                        <p className="text-rose-300">Platform Share (30%): ₹{trend.superAdminEarnings.toLocaleString('en-IN')}</p>
                        <p className="text-emerald-300">Store Admin (70%): ₹{trend.adminEarnings.toLocaleString('en-IN')}</p>
                        <p className="text-slate-300">Units Sold: {trend.unitsSold} units</p>
                      </div>

                      <div className="w-full bg-slate-100 rounded-t-lg overflow-hidden flex flex-col justify-end h-full">
                        <div
                          style={{ height: `${heightPct}%` }}
                          className="bg-gradient-to-t from-rose-600 to-rose-400 rounded-t-lg transition-all group-hover:brightness-110"
                        />
                      </div>
                      <span className="text-[10px] text-slate-400 font-medium truncate w-full text-center">
                        {trend.date.slice(5)}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Legend with explicit explanation */}
              <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-slate-600 font-medium pt-2">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded bg-rose-500" />
                  <span>Gross Customer Revenue (100%)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded bg-emerald-500" />
                  <span>Store Vendor Payout (70%)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded bg-rose-700" />
                  <span>Platform Commission (30%)</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Top Selling Products */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-lg font-bold text-slate-900">
              {STRINGS.superAdminDashboard.topProductsTitle}
            </h2>
            <Link href="/dashboard/products" className="text-xs text-rose-600 font-semibold hover:underline">
              {STRINGS.superAdminDashboard.viewProducts}
            </Link>
          </div>
          <p className="text-xs text-slate-400 mb-4">
            Ranked by units sold & 30% platform margin
          </p>

          <div className="space-y-3 flex-1 overflow-y-auto">
            {(!data?.topSellingProducts || data.topSellingProducts.length === 0) ? (
              <p className="text-xs text-slate-400 text-center py-8">
                {STRINGS.superAdminDashboard.noTopProducts}
              </p>
            ) : (
              data.topSellingProducts.slice(0, 5).map((p) => (
                <div key={p.product_id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 border border-slate-100 transition-colors">
                  <img
                    src={p.image_url || "https://via.placeholder.com/40"}
                    alt={p.product_name}
                    className="w-10 h-10 rounded-lg object-cover bg-slate-100 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate">{p.product_name}</p>
                    <p className="text-[10px] text-slate-500">
                      Collection: <span className="font-semibold text-slate-700">{p.category_name}</span> • Sold: <span className="font-bold text-slate-800">{p.units_sold}</span> units
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-black text-rose-600">₹{p.super_admin_share.toLocaleString('en-IN')}</p>
                    <p className="text-[10px] text-slate-400 font-medium">30% Platform</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Category Performance & Recent Sales Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Sales List */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
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

        {/* Category Breakdown */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-slate-900">
              {STRINGS.superAdminDashboard.categoryPerformanceTitle}
            </h2>
            <p className="text-xs text-slate-400">
              Revenue & margin breakdown by collection
            </p>
          </div>
          <div className="space-y-4">
            {(!data?.categoryPerformance || data.categoryPerformance.length === 0) ? (
              <p className="text-xs text-slate-400 text-center py-6">
                {STRINGS.superAdminDashboard.noCategoryMetrics}
              </p>
            ) : (
              data.categoryPerformance.map((c) => (
                <div key={c.category_id} className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-bold text-slate-900">Collection: {c.category_name}</span>
                    <span className="text-xs font-black text-slate-900">Gross: ₹{c.gross_revenue.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-slate-500">
                    <span>Units Sold: <strong className="text-slate-700">{c.units_sold}</strong></span>
                    <span className="text-rose-600 font-bold">Platform (30%): ₹{c.super_admin_share.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
