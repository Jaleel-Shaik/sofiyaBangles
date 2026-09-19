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
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            {STRINGS.superAdminDashboard.title}
          </h1>
          <p className="text-slate-300 text-xs md:text-sm mt-1">
            {STRINGS.superAdminDashboard.subtitle}
          </p>
        </div>

        {/* Quick Filter Pills & Exports */}
        <div className="flex items-center gap-2 flex-wrap">
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

          <a
            href={api.superAdmin.exportSalesCsvUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 bg-[#E8436E] hover:bg-[#CC3366] text-white px-3.5 py-1.5 min-h-[44px] rounded-xl text-xs font-semibold transition-colors shadow-sm"
          >
            <Download className="w-3.5 h-3.5" /> {STRINGS.superAdminDashboard.exportCsv}
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
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  {STRINGS.superAdminDashboard.grossSales}
                </span>
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <DollarSign className="w-5 h-5" />
                </div>
              </div>
              <p className="text-2xl font-black text-slate-900 group-hover:text-blue-600 transition-colors">
                ₹{(kpis?.grossSales || 0).toLocaleString('en-IN')}
              </p>
              <p className="text-xs text-slate-500 mt-1 flex items-center justify-between">
                <span>{STRINGS.superAdminDashboard.grossSalesDesc}</span>
                <span className="text-blue-600 font-semibold text-[10px] group-hover:underline">
                  {STRINGS.superAdminDashboard.viewLedger}
                </span>
              </p>
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
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-rose-700 uppercase tracking-wider">
                  {STRINGS.superAdminDashboard.superAdminShare}
                </span>
                <div className="w-9 h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                  <PieChart className="w-5 h-5" />
                </div>
              </div>
              <p className="text-2xl font-black text-rose-700">
                ₹{(kpis?.superAdminEarnings || 0).toLocaleString('en-IN')}
              </p>
              <p className="text-xs text-rose-600 font-medium mt-1 flex items-center justify-between">
                <span>{STRINGS.superAdminDashboard.platformRevenueDesc}</span>
                <span className="font-bold text-[10px] underline">
                  {STRINGS.superAdminDashboard.viewDetails}
                </span>
              </p>
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
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  {STRINGS.superAdminDashboard.adminShare}
                </span>
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <TrendingUp className="w-5 h-5" />
                </div>
              </div>
              <p className="text-2xl font-black text-slate-900 group-hover:text-emerald-600 transition-colors">
                ₹{(kpis?.adminEarnings || 0).toLocaleString('en-IN')}
              </p>
              <p className="text-xs text-slate-500 mt-1 flex items-center justify-between">
                <span>{STRINGS.superAdminDashboard.adminPayoutsDesc}</span>
                <span className="text-emerald-600 font-semibold text-[10px] group-hover:underline">
                  {STRINGS.superAdminDashboard.viewLedger}
                </span>
              </p>
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
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  {STRINGS.superAdminDashboard.netSales}
                </span>
                <div className="w-9 h-9 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <ShieldCheck className="w-5 h-5" />
                </div>
              </div>
              <p className="text-2xl font-black text-slate-900 group-hover:text-violet-600 transition-colors">
                ₹{(kpis?.netSales || 0).toLocaleString('en-IN')}
              </p>
              <p className="text-xs text-slate-500 mt-1 flex items-center justify-between">
                <span>{STRINGS.superAdminDashboard.refundsPrefix(kpis?.totalRefunds || 0)}</span>
                <span className="text-violet-600 font-semibold text-[10px] group-hover:underline">
                  {STRINGS.superAdminDashboard.viewAudit}
                </span>
              </p>
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
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  {STRINGS.superAdminDashboard.productsSold}
                </span>
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <ShoppingBag className="w-5 h-5" />
                </div>
              </div>
              <p className="text-2xl font-black text-slate-900 group-hover:text-amber-600 transition-colors">
                {kpis?.productsSold || 0}
              </p>
              <p className="text-xs text-slate-500 mt-1 flex items-center justify-between">
                <span>{STRINGS.superAdminDashboard.unitsSoldPrefix(kpis?.unitsSold || 0)}</span>
                <span className="text-amber-600 font-semibold text-[10px] group-hover:underline">
                  {STRINGS.superAdminDashboard.ordersAndBills}
                </span>
              </p>
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
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  {STRINGS.superAdminDashboard.activeCatalog}
                </span>
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Package className="w-5 h-5" />
                </div>
              </div>
              <p className="text-2xl font-black text-slate-900 group-hover:text-indigo-600 transition-colors">
                {kpis?.activeProducts || 0}
              </p>
              <p className="text-xs text-slate-500 mt-1 flex items-center justify-between">
                <span>{STRINGS.superAdminDashboard.totalCatalogPrefix(kpis?.totalProducts || 0)}</span>
                <span className="text-indigo-600 font-semibold text-[10px] group-hover:underline">
                  {STRINGS.superAdminDashboard.manageCatalog}
                </span>
              </p>
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
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  {STRINGS.superAdminDashboard.pendingOrders}
                </span>
                <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Clock className="w-5 h-5" />
                </div>
              </div>
              <p className="text-2xl font-black text-slate-900 group-hover:text-sky-600 transition-colors">
                {kpis?.pendingOrders || 0}
              </p>
              <p className="text-xs text-slate-500 mt-1 flex items-center justify-between">
                <span>{STRINGS.superAdminDashboard.awaitingFulfillment}</span>
                <span className="text-sky-600 font-semibold text-[10px] group-hover:underline">
                  {STRINGS.superAdminDashboard.dispatchOrders}
                </span>
              </p>
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
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">
                  {STRINGS.superAdminDashboard.lowStockAlert}
                </span>
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <AlertTriangle className="w-5 h-5" />
                </div>
              </div>
              <p className="text-2xl font-black text-amber-700">{kpis?.lowStockCount || 0}</p>
              <p className="text-xs text-amber-600 mt-1 flex items-center justify-between">
                <span>{STRINGS.superAdminDashboard.outOfStockPrefix(kpis?.outOfStockCount || 0)}</span>
                <span className="font-bold text-[10px] underline">
                  {STRINGS.superAdminDashboard.restockAlert}
                </span>
              </p>
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
                      <div className="absolute bottom-full mb-2 hidden group-hover:block bg-slate-900 text-white text-[10px] p-2 rounded-lg z-20 whitespace-nowrap shadow-lg">
                        <p className="font-bold">{trend.date}</p>
                        <p>Gross: ₹{trend.grossSales}</p>
                        <p className="text-rose-300">SuperAdmin (30%): ₹{trend.superAdminEarnings}</p>
                        <p className="text-emerald-300">Admin (70%): ₹{trend.adminEarnings}</p>
                        <p>Units: {trend.unitsSold}</p>
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

              {/* Legend */}
              <div className="flex items-center justify-center gap-6 text-xs text-slate-600 font-medium">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded bg-rose-500" /> {STRINGS.superAdminDashboard.legendGrossRevenue}
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded bg-emerald-500" /> {STRINGS.superAdminDashboard.legendAdminShare}
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded bg-rose-700" /> {STRINGS.superAdminDashboard.legendSuperAdminShare}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Top Selling Products */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-900">
              {STRINGS.superAdminDashboard.topProductsTitle}
            </h2>
            <Link href="/dashboard/products" className="text-xs text-rose-600 font-semibold hover:underline">
              {STRINGS.superAdminDashboard.viewProducts}
            </Link>
          </div>

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
                    className="w-10 h-10 rounded-lg object-cover bg-slate-100"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate">{p.product_name}</p>
                    <p className="text-[10px] text-slate-500">{p.category_name} • {p.units_sold} {STRINGS.superAdminDashboard.unitsSoldSuffix}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-black text-rose-600">₹{p.super_admin_share}</p>
                    <p className="text-[10px] text-slate-400">30% {STRINGS.superAdminDashboard.shareSuffix}</p>
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
                {STRINGS.superAdminDashboard.recentSalesSubtitle}
              </p>
            </div>
            <Link href="/dashboard/revenue" className="text-xs font-semibold text-rose-600 hover:text-rose-700">
              {STRINGS.superAdminDashboard.viewSalesLedgerBtn}
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-semibold uppercase">
                  <th className="pb-3">{STRINGS.superAdminDashboard.tableOrderNumber}</th>
                  <th className="pb-3">{STRINGS.superAdminDashboard.tableCustomer}</th>
                  <th className="pb-3">{STRINGS.superAdminDashboard.tableTotalAmount}</th>
                  <th className="pb-3">{STRINGS.superAdminDashboard.tableAdminShare}</th>
                  <th className="pb-3">{STRINGS.superAdminDashboard.tableSuperAdminShare}</th>
                  <th className="pb-3 text-right">{STRINGS.superAdminDashboard.tableAction}</th>
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
                      <td className="py-3 font-semibold text-slate-900">₹{s.total_amount}</td>
                      <td className="py-3 text-emerald-600 font-medium">₹{s.admin_share}</td>
                      <td className="py-3 text-rose-600 font-bold">₹{s.super_admin_share}</td>
                      <td className="py-3 text-right">
                        <Link
                          href={`/dashboard/sales/${s.order_id}`}
                          className="text-[#E8436E] hover:text-[#CC3366] font-semibold hover:underline"
                        >
                          {STRINGS.superAdminDashboard.actionDetails}
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
          <h2 className="text-lg font-bold text-slate-900 mb-4">
            {STRINGS.superAdminDashboard.categoryPerformanceTitle}
          </h2>
          <div className="space-y-4">
            {(!data?.categoryPerformance || data.categoryPerformance.length === 0) ? (
              <p className="text-xs text-slate-400 text-center py-6">
                {STRINGS.superAdminDashboard.noCategoryMetrics}
              </p>
            ) : (
              data.categoryPerformance.map((c) => (
                <div key={c.category_id} className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-bold text-slate-900">{c.category_name}</span>
                    <span className="text-xs font-black text-rose-600">₹{c.gross_revenue}</span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-slate-500">
                    <span>{c.units_sold} {STRINGS.superAdminDashboard.unitsSoldSuffix}</span>
                    <span className="text-rose-500 font-semibold">SuperAdmin (30%): ₹{c.super_admin_share}</span>
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
