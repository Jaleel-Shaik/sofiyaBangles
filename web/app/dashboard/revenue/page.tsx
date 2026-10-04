"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { type RevenueLedgerItem } from "@/src/lib/api";
import { useAuth } from "@/features/auth/lib/auth-context";
import {
  TrendingUp,
  Download,
  Filter,
  Search,
  Package,
  Shield,
  Clock,
  Settings,
  Calendar,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Check,
  X,
} from "lucide-react";
import Link from "next/link";
import { api } from "@/src/lib/api";
import { STRINGS } from "@/src/constants/strings";

const MONTHS = [
  { num: "1", short: "Jan", full: "January" },
  { num: "2", short: "Feb", full: "February" },
  { num: "3", short: "Mar", full: "March" },
  { num: "4", short: "Apr", full: "April" },
  { num: "5", short: "May", full: "May" },
  { num: "6", short: "Jun", full: "June" },
  { num: "7", short: "Jul", full: "July" },
  { num: "8", short: "Aug", full: "August" },
  { num: "9", short: "Sep", full: "September" },
  { num: "10", short: "Oct", full: "October" },
  { num: "11", short: "Nov", full: "November" },
  { num: "12", short: "Dec", full: "December" },
];

function CalendarMonthYearPicker({
  selectedMonth,
  selectedYear,
  onSelectPeriod,
  onReset,
}: {
  selectedMonth: string;
  selectedYear: string;
  onSelectPeriod: (month: string, year: string) => void;
  onReset: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const currentYearNum = new Date().getFullYear();
  const currentMonthNum = new Date().getMonth() + 1;

  const [pickerYear, setPickerYear] = useState<number>(
    selectedYear ? Number(selectedYear) : currentYearNum
  );

  useEffect(() => {
    if (selectedYear) setPickerYear(Number(selectedYear));
  }, [selectedYear]);

  const handleApply = (m: string, y: number | string) => {
    onSelectPeriod(m, y.toString());
    setIsOpen(false);
  };

  const handlePreset = (preset: "this_month" | "last_month" | "this_year" | "all") => {
    if (preset === "this_month") {
      onSelectPeriod(currentMonthNum.toString(), currentYearNum.toString());
    } else if (preset === "last_month") {
      const lastMonthNum = currentMonthNum === 1 ? 12 : currentMonthNum - 1;
      const lastMonthYear = currentMonthNum === 1 ? currentYearNum - 1 : currentYearNum;
      onSelectPeriod(lastMonthNum.toString(), lastMonthYear.toString());
    } else if (preset === "this_year") {
      onSelectPeriod("", currentYearNum.toString());
    } else if (preset === "all") {
      onSelectPeriod("", "");
    }
    setIsOpen(false);
  };

  const selectedMonthObj = MONTHS.find((m) => m.num === selectedMonth);
  const displayLabel = selectedMonth
    ? `${selectedMonthObj?.full} ${selectedYear || currentYearNum}`
    : selectedYear
    ? `Year ${selectedYear} (All Months)`
    : "All Time (Entire Catalog)";

  return (
    <div className="relative inline-block w-full">
      {/* Interactive Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-3 bg-white/10 hover:bg-white/20 border border-white/25 text-white px-4 py-2.5 rounded-xl min-h-[46px] shadow-sm transition-all text-xs font-bold"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <Calendar className="w-4 h-4 text-rose-300 shrink-0" />
          <div className="text-left truncate">
            <span className="text-[10px] block font-semibold text-rose-200/80 uppercase tracking-wider">
              Calendar Period Filter
            </span>
            <span className="text-xs font-extrabold text-white truncate block">
              {displayLabel}
            </span>
          </div>
        </div>
        <ChevronDown className={`w-4 h-4 text-rose-300 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {/* Popover Calendar Card */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Click-away backdrop */}
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

            {/* Calendar Popover */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.15 }}
              className="absolute left-0 sm:left-auto right-0 top-full mt-2 w-full sm:w-[380px] bg-slate-900 border border-slate-700/90 rounded-2xl shadow-2xl p-4 z-50 text-white space-y-4"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-rose-400" />
                  <span className="text-xs font-bold text-slate-200">Financial Calendar Filter</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Year Navigation Bar */}
              <div className="flex items-center justify-between bg-slate-800/80 p-2 rounded-xl border border-slate-700">
                <button
                  type="button"
                  onClick={() => setPickerYear((y) => y - 1)}
                  className="p-1.5 hover:bg-slate-700 text-rose-300 rounded-lg transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center font-bold"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="text-center">
                  <span className="text-base font-black text-white">{pickerYear}</span>
                  <span className="text-[10px] block text-slate-400 font-medium">Fiscal Year</span>
                </div>
                <button
                  type="button"
                  onClick={() => setPickerYear((y) => y + 1)}
                  className="p-1.5 hover:bg-slate-700 text-rose-300 rounded-lg transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center font-bold"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Quick Presets */}
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { id: "this_month", label: "This Month" },
                  { id: "last_month", label: "Last Month" },
                  { id: "this_year", label: "This Year" },
                  { id: "all", label: "All Time" },
                ].map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handlePreset(p.id as any)}
                    className="py-1.5 px-2 bg-slate-800 hover:bg-rose-950/80 text-rose-200 hover:text-white border border-slate-700 hover:border-rose-500/50 rounded-lg text-[10px] font-extrabold text-center transition-all truncate"
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {/* 12 Months Grid */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Select Month ({pickerYear})
                  </span>
                  <button
                    type="button"
                    onClick={() => handleApply("", pickerYear)}
                    className="text-[10px] text-rose-400 font-bold hover:underline"
                  >
                    Select Full Year ({pickerYear})
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {MONTHS.map((m) => {
                    const isSelected =
                      selectedMonth === m.num && selectedYear === pickerYear.toString();
                    const isCurrentMonth =
                      currentMonthNum.toString() === m.num && currentYearNum === pickerYear;

                    return (
                      <button
                        key={m.num}
                        type="button"
                        onClick={() => handleApply(m.num, pickerYear)}
                        className={`relative p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between min-h-[52px] ${
                          isSelected
                            ? "bg-gradient-to-r from-rose-600 to-pink-600 border-rose-400 text-white font-black shadow-lg shadow-rose-600/30 scale-[1.02]"
                            : "bg-slate-800/60 border-slate-700/80 hover:bg-slate-700 hover:border-slate-500 text-slate-200 font-semibold"
                        }`}
                      >
                        <span className="text-xs">{m.full}</span>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-[10px] opacity-75 font-mono">0{m.num}</span>
                          {isCurrentMonth && !isSelected && (
                            <span className="text-[9px] bg-rose-500/20 text-rose-300 px-1 rounded font-bold">
                              Now
                            </span>
                          )}
                          {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Reset Footer */}
              <div className="pt-2 border-t border-slate-800 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onReset();
                    setIsOpen(false);
                  }}
                  className="w-full py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors min-h-[38px]"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Reset All Filters
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function ProductSalesRevenuePage() {
  const { user, isLoading: authLoading } = useAuth();
  const [items, setItems] = useState<RevenueLedgerItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [transactionType, setTransactionType] = useState("");
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
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
          limit: 50,
          transactionType: transactionType || undefined,
          month: selectedMonth ? Number(selectedMonth) : undefined,
          year: selectedYear ? Number(selectedYear) : undefined,
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
  }, [page, transactionType, selectedMonth, selectedYear, user]);

  if (!authLoading && user && user.role !== "super_admin") {
    return (
      <div className="bg-white border border-rose-200 rounded-2xl p-8 text-center max-w-lg mx-auto mt-10 shadow-sm">
        <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Shield className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900 mb-2">
          {STRINGS.superAdminAuth.accessRequiredTitle}
        </h2>
        <p className="text-xs text-slate-500 mb-6">
          {STRINGS.superAdminAuth.accessRequiredDesc}
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 bg-[#E8436E] text-white px-5 py-2.5 min-h-[44px] rounded-xl text-xs font-bold hover:bg-[#CC3366] transition-colors"
        >
          {STRINGS.superAdminAuth.returnToDashboard}
        </Link>
      </div>
    );
  }

  // Aggregate stats across current filtered items
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
    const codeMatch = (item.unique_code || "").toLowerCase().includes(q);
    return nameMatch || orderMatch || adminMatch || codeMatch;
  });

  const selectedMonthObj = MONTHS.find((m) => m.num === selectedMonth);
  const periodLabel = selectedMonth
    ? `${selectedMonthObj?.full} ${selectedYear || new Date().getFullYear()}`
    : selectedYear
    ? `Year ${selectedYear}`
    : "All Time";

  const handleSelectPeriod = (month: string, year: string) => {
    setSelectedMonth(month);
    setSelectedYear(year);
    setPage(1);
  };

  const handleResetFilters = () => {
    setSelectedMonth("");
    setSelectedYear(new Date().getFullYear().toString());
    setTransactionType("");
    setSearch("");
    setPage(1);
  };

  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-extrabold uppercase tracking-widest bg-rose-50 text-rose-700 border border-rose-200 px-2.5 py-0.5 rounded-full">
              ROLE: PLATFORM SUPER ADMIN (FINANCIAL SETTLEMENT HUB)
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-[#E8436E]" /> {STRINGS.revenue.title}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {STRINGS.revenue.subtitle(commissionSettings.admin_percentage, commissionSettings.super_admin_percentage)}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/settings/commission"
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 min-h-[44px] rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <Settings className="w-4 h-4 text-slate-500" /> {STRINGS.revenue.adjustRatio}
          </Link>

          <a
            href={api.superAdmin.exportRevenueCsvUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-[#E8436E] hover:bg-[#CC3366] text-white px-4 py-2.5 min-h-[44px] rounded-xl text-xs font-semibold shadow-sm transition-all"
          >
            <Download className="w-4 h-4" /> {STRINGS.revenue.exportCsv}
          </a>
        </div>
      </div>

      {/* Interactive Calendar Month & Year Financial Filter Toolbar */}
      <div className="bg-gradient-to-r from-slate-900 via-rose-950 to-slate-900 rounded-2xl p-5 text-white shadow-md border border-rose-900/40 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center justify-center shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                Monthly & Yearly Financial Calendar Filter
              </h2>
              <p className="text-xs text-rose-200/80">
                Track products sold, 70% Admin Store Payout & 30% SuperAdmin Commission by month and year
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-rose-200/90">Active Period:</span>
            <span className="bg-white/15 backdrop-blur text-white text-xs font-extrabold px-3 py-1 rounded-xl border border-white/20">
              {periodLabel}
            </span>
          </div>
        </div>

        {/* Calendar Picker Trigger row */}
        <div className="pt-2 border-t border-white/10">
          <CalendarMonthYearPicker
            selectedMonth={selectedMonth}
            selectedYear={selectedYear}
            onSelectPeriod={handleSelectPeriod}
            onReset={handleResetFilters}
          />
        </div>
      </div>

      {/* KPI Cards (Recalculated for selected Month & Year) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-3 gap-4">
        {/* Total Gross Sales */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider bg-blue-50 px-2 py-0.5 rounded">
              [PERIOD GMV]
            </span>
          </div>
          <p className="text-xs font-semibold text-slate-500">Gross Sales ({periodLabel})</p>
          <p className="text-2xl font-bold text-slate-900">₹{totalGross.toLocaleString('en-IN')}</p>
          <p className="text-[11px] text-slate-400">Total revenue in selected period</p>
        </div>

        {/* Admin Share */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider bg-emerald-50 px-2 py-0.5 rounded">
              [STORE PAYOUT]
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
              {commissionSettings.admin_percentage}%
            </span>
          </div>
          <p className="text-xs font-semibold text-slate-500">Admin Store Payout ({periodLabel})</p>
          <p className="text-2xl font-bold text-emerald-600">₹{totalAdminShare.toLocaleString('en-IN')}</p>
          <p className="text-[11px] text-slate-400">Allocated to sellers in selected period</p>
        </div>

        {/* SuperAdmin Share */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider bg-rose-50 px-2 py-0.5 rounded">
              [PLATFORM PROFIT]
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-100 text-[#E8436E]">
              {commissionSettings.super_admin_percentage}%
            </span>
          </div>
          <p className="text-xs font-semibold text-slate-500">SuperAdmin Commission ({periodLabel})</p>
          <p className="text-2xl font-bold text-[#E8436E]">
            ₹{totalSuperAdminShare.toLocaleString('en-IN')}
          </p>
          <p className="text-[11px] text-slate-400">Platform earnings in selected period</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Search with label */}
        <div className="flex items-center gap-2 w-full md:w-auto flex-1">
          <label htmlFor="searchTransactions" className="text-xs font-semibold text-slate-500 whitespace-nowrap hidden sm:inline">
            Search Ledger:
          </label>
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
            <input
              id="searchTransactions"
              type="text"
              placeholder="Search product, order ID, code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 min-h-[44px] rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#E8436E]"
            />
          </div>
        </div>

        {/* Transaction Type Filter with label */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold">
            <Filter className="w-4 h-4 text-slate-400" />
            <label htmlFor="transTypeSelect" className="cursor-pointer">Type:</label>
          </div>
          <select
            id="transTypeSelect"
            value={transactionType}
            onChange={(e) => {
              setTransactionType(e.target.value);
              setPage(1);
            }}
            className="text-xs border border-slate-200 rounded-xl px-3 py-2 min-h-[44px] bg-white text-slate-700 focus:outline-none focus:border-[#E8436E] font-medium"
          >
            <option value="">{STRINGS.revenue.allTransactions}</option>
            <option value="SALE">SALE (Completed)</option>
            <option value="REFUND">REFUND (Reversed)</option>
          </select>
          <span className="text-xs text-slate-400 font-medium">({total} Records)</span>
        </div>
      </div>

      {/* Product Sales Ledger Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs">{STRINGS.common.loading}</div>
        ) : filteredItems.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs font-medium">
            <p className="font-bold text-sm text-slate-700 mb-1">{STRINGS.revenue.emptyTitle}</p>
            <p>{STRINGS.revenue.emptyDesc}</p>
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
                {filteredItems.map((item: RevenueLedgerItem) => {
                  const unitRate = item.sale_rate ?? (item.gross_amount / (item.quantity || 1));
                  const displayCode = item.unique_code || (item.product_id ? `PROD-${item.product_id.slice(-6).toUpperCase()}` : null);
                  const displayOrderNo = item.order_number || (item.order_id ? `ORD-${item.order_id.slice(-6).toUpperCase()}` : "N/A");
                  const isReversed = item.status === "reversed" || item.transaction_type === "REFUND";

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Product Sold */}
                      <td className="p-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-rose-50 text-[#E8436E] flex items-center justify-center shrink-0">
                            <Package className="w-4 h-4" />
                          </div>
                          <div>
                            <Link
                              href={`/dashboard/products/${item.product_id}`}
                              className="font-bold text-slate-900 hover:text-[#E8436E] transition-colors leading-tight block"
                            >
                              {item.product_name || "Bangles Set"}
                            </Link>
                            {displayCode && (
                              <span className="inline-block mt-0.5 text-[10px] font-bold text-rose-600 bg-rose-50 border border-rose-100 px-1.5 py-0.2 rounded">
                                {displayCode}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Unit Price (Sold Rate) */}
                      <td className="p-4 text-slate-900 font-bold">
                        ₹{Number(unitRate).toLocaleString('en-IN')}
                      </td>

                      {/* Quantity Sold */}
                      <td className="p-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
                          {item.quantity || 1}
                        </span>
                      </td>

                      {/* Gross Revenue */}
                      <td className="p-4 text-slate-900 font-extrabold text-sm">
                        ₹{Number(item.gross_amount).toLocaleString('en-IN')}
                      </td>

                      {/* Admin Share (70%) */}
                      <td className="p-4">
                        <p className="text-emerald-700 font-extrabold">
                          ₹{Number(item.admin_share_amount).toLocaleString('en-IN')}
                        </p>
                        <p className="text-[10px] text-emerald-600 font-medium">
                          ({item.admin_share_percentage ?? commissionSettings.admin_percentage}%)
                        </p>
                      </td>

                      {/* Super-Admin Share (30%) */}
                      <td className="p-4">
                        <p className="text-[#E8436E] font-black">
                          ₹{Number(item.super_admin_share_amount).toLocaleString('en-IN')}
                        </p>
                        <p className="text-[10px] text-rose-500 font-medium">
                          ({item.super_admin_share_percentage ?? commissionSettings.super_admin_percentage}%)
                        </p>
                      </td>

                      {/* Order ID & Date */}
                      <td className="p-4 text-[11px] text-slate-500">
                        <Link
                          href={`/dashboard/sales/${item.order_id}`}
                          className="font-bold text-slate-800 hover:text-[#E8436E] transition-colors"
                        >
                          {displayOrderNo}
                        </Link>
                        <p className="flex items-center gap-1 text-[10px] text-slate-400 mt-0.5">
                          <Clock className="w-3 h-3" />
                          {item.created_at ? new Date(item.created_at).toLocaleDateString("en-IN") : "Just now"}
                        </p>
                      </td>

                      {/* Status Badge */}
                      <td className="p-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                            isReversed
                              ? "bg-rose-50 text-rose-700 border-rose-200"
                              : "bg-emerald-50 text-emerald-700 border-emerald-200"
                          }`}
                        >
                          {isReversed ? "REVERSED" : (item.status || "COMPLETED").toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  );
                })}
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
