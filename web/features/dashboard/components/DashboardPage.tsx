"use client";

import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/features/auth/lib/auth-context";
import { motion } from "framer-motion";
import {
  Package,
  Layers,
  ShoppingBag,
  PlusCircle,
  ArrowRight,
  ShoppingCart,
  PieChart,
  ShieldCheck,
  ArrowUpRight,
} from "lucide-react";
import { api, type Product, type AnalyticsOverview, type Category, type ModelType } from "@/src/lib/api";
import Link from "next/link";
import { STRINGS } from "@/src/constants/strings";
import SuperAdminDashboard from "./SuperAdminDashboard";

export default function DashboardPage() {
  const { user } = useAuth();
  const role = (user?.role || "").toLowerCase().trim();
  const isSuperAdmin = role === "super_admin" || role === "superadmin";
  const [superAdminView, setSuperAdminView] = useState<"financial" | "operations">("financial");

  const [stats, setStats] = useState<AnalyticsOverview | null>(null);
  const [recentProducts, setRecentProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [modelTypes, setModelTypes] = useState<ModelType[]>([]);
  const [selectedModelType, setSelectedModelType] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setError(null);
      try {
        const [analyticsData, productsData, cats, mts] = await Promise.all([
          api.admin.getOverviewAnalytics(),
          api.admin.getAdminProducts(1, 6),
          api.admin.getCategories(),
          api.admin.getModelTypes(),
        ]);
        setStats(analyticsData);
        setRecentProducts(productsData.products || []);
        setCategories(cats);
        setModelTypes(mts);
      } catch (err: any) {
        const msg = err?.response?.data?.message || err?.message || "Failed to connect to server";
        setError(msg);
        console.error("Dashboard fetch error:", msg);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Filter categories based on selected model type
  const filteredCategories = useMemo(() => {
    if (!selectedModelType) return categories;
    return categories.filter((c) => c.model_type_id === selectedModelType);
  }, [categories, selectedModelType]);

  // Re-fetch overview analytics whenever filters change
  useEffect(() => {
    const updateStats = async () => {
      setStatsLoading(true);
      try {
        const data = await api.admin.getOverviewAnalytics(
          selectedCategory || undefined,
          selectedModelType || undefined
        );
        setStats(data);
      } catch (err) {
        console.error("Failed to update overview stats", err);
      } finally {
        setStatsLoading(false);
      }
    };

    if (!loading) {
      updateStats();
    }
  }, [selectedModelType, selectedCategory]);

  // Real-time synchronization: refresh stats and recent products when any product is sold
  useEffect(() => {
    const handleProductSold = () => {
      api.admin
        .getOverviewAnalytics(
          selectedCategory || undefined,
          selectedModelType || undefined
        )
        .then(setStats)
        .catch(() => {});
      api.admin
        .getAdminProducts(1, 6)
        .then((res) => {
          setRecentProducts(res.products || []);
        })
        .catch(() => {});
    };
    window.addEventListener("product-sold", handleProductSold);
    return () => window.removeEventListener("product-sold", handleProductSold);
  }, [selectedCategory, selectedModelType]);

  return (
    <div className="space-y-6">
      {/* Super Admin Role View Switcher */}
      {isSuperAdmin && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-white shadow-md"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-[#E8436E] flex items-center justify-center border border-rose-500/30 shrink-0">
              <PieChart className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-widest bg-rose-600/30 text-rose-300 border border-rose-500/30 px-2 py-0.5 rounded">
                  ROLE: PLATFORM SUPER ADMIN
                </span>
                <span className="text-xs text-slate-400 font-semibold">• 70% Store / 30% Platform Active</span>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                Toggle between Executive Financial Analytics and Store Operations Catalog
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-800/90 p-1.5 rounded-xl border border-slate-700 w-full sm:w-auto">
            <button
              onClick={() => setSuperAdminView("financial")}
              className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                superAdminView === "financial"
                  ? "bg-[#E8436E] text-white shadow-sm"
                  : "text-slate-300 hover:text-white hover:bg-slate-700/50"
              }`}
            >
              Executive Financial Hub
            </button>
            <button
              onClick={() => setSuperAdminView("operations")}
              className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                superAdminView === "operations"
                  ? "bg-[#E8436E] text-white shadow-sm"
                  : "text-slate-300 hover:text-white hover:bg-slate-700/50"
              }`}
            >
              Store Operations & Catalog
            </button>
          </div>
        </motion.div>
      )}

      {/* When SuperAdmin is in Financial Hub mode, render the rich SuperAdminDashboard */}
      {isSuperAdmin && superAdminView === "financial" ? (
        <SuperAdminDashboard />
      ) : (
        <>
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-slate-900 via-rose-950 to-slate-900 rounded-2xl p-6 text-white border border-rose-900/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-md"
          >
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider bg-white/10 text-rose-200 border border-white/20 px-2.5 py-0.5 rounded-full">
                  {isSuperAdmin ? "ROLE: STORE OPERATIONS (SUPER ADMIN INSPECTION)" : "ROLE: STORE OPERATIONS ADMIN (CATALOG & PHYSICAL INVENTORY)"}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                {STRINGS.adminDashboard.welcome(user?.full_name || "Admin")}
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 mt-1">
                Real-time inventory levels, bangle model types, catalog showcase & WhatsApp sale logs.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Link
                href="/dashboard/products/new"
                className="flex items-center gap-1.5 bg-[#E8436E] hover:bg-[#CC3366] text-white px-4 py-2 min-h-[44px] rounded-xl text-xs font-bold transition-all shadow-sm"
              >
                <PlusCircle className="w-4 h-4" />
                {STRINGS.adminDashboard.addNewBangles}
              </Link>
              <Link
                href="/dashboard/orders?action=new-sale"
                className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white border border-white/20 px-4 py-2 min-h-[44px] rounded-xl text-xs font-bold transition-all shadow-sm"
              >
                <ShoppingCart className="w-4 h-4 text-emerald-400" />
                {STRINGS.adminDashboard.whatsAppSale}
              </Link>
            </div>
          </motion.div>

          {/* Overview Stats */}
          <div>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
              <div>
                <h2 className="text-lg font-bold text-[#171717]">
                  Store Inventory & Catalog Performance
                </h2>
                <p className="text-xs text-slate-500">
                  Live data filtered by model category and bangle collections
                </p>
              </div>

              {/* Filters with explicit labels */}
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <label htmlFor="modelTypeFilter" className="text-xs font-semibold text-slate-500 whitespace-nowrap">
                    Model Type:
                  </label>
                  <select
                    id="modelTypeFilter"
                    value={selectedModelType}
                    onChange={(e) => {
                      setSelectedModelType(e.target.value);
                      setSelectedCategory("");
                    }}
                    className="text-xs font-semibold px-3 py-2 min-h-[40px] rounded-xl border border-[#E5E5E5] bg-white text-[#171717] focus:outline-none focus:border-[#E8436E] cursor-pointer shadow-sm"
                  >
                    <option value="">{STRINGS.adminDashboard.allModelTypes}</option>
                    {modelTypes.map((mt) => (
                      <option key={mt.id} value={mt.id}>{mt.name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-1.5">
                  <label htmlFor="categoryFilter" className="text-xs font-semibold text-slate-500 whitespace-nowrap">
                    Collection:
                  </label>
                  <select
                    id="categoryFilter"
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="text-xs font-semibold px-3 py-2 min-h-[40px] rounded-xl border border-[#E5E5E5] bg-white text-[#171717] focus:outline-none focus:border-[#E8436E] cursor-pointer shadow-sm"
                  >
                    <option value="">{STRINGS.adminDashboard.allCategories}</option>
                    {filteredCategories.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.category_name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {loading || statsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-white rounded-2xl border border-[#E5E5E5] p-5 animate-pulse">
                    <div className="w-11 h-11 bg-gray-200 rounded-xl mb-3" />
                    <div className="h-8 w-24 bg-gray-200 rounded mb-2" />
                    <div className="h-4 w-32 bg-gray-200 rounded" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* Card 1: Total Catalog Designs */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 }}
                  className="bg-white rounded-2xl border border-[#E5E5E5] hover:border-blue-400 hover:shadow-lg hover:shadow-blue-50 transition-all duration-200 p-5 flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider bg-blue-50 px-2.5 py-0.5 rounded">
                        [CATALOG BREADTH]
                      </span>
                      <span className="text-[11px] font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                        {stats?.activeProducts ?? stats?.totalProducts ?? 0} Active Designs
                      </span>
                    </div>

                    <Link
                      href={selectedCategory ? `/dashboard/products?category=${selectedCategory}` : "/dashboard/products"}
                      className="block focus:outline-none"
                    >
                      <div className="flex items-baseline justify-between mt-2">
                        <p className="text-3xl font-black text-[#171717] tracking-tight group-hover:text-blue-600 transition-colors">
                          {stats?.totalProducts || 0} <span className="text-sm font-semibold text-slate-400">designs</span>
                        </p>
                        <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-blue-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                      </div>
                      <p className="text-sm text-[#171717] font-bold mt-1">
                        Total Catalog Designs {selectedCategory || selectedModelType ? "(Filtered)" : ""}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Number of distinct bangle design entries registered in store catalog
                      </p>
                    </Link>
                  </div>

                  {/* Functional Action Footer */}
                  <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                    <Link
                      href={selectedCategory ? `/dashboard/products?category=${selectedCategory}` : "/dashboard/products"}
                      className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 group-hover:underline"
                    >
                      Manage Full Catalog
                      <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                    </Link>
                    <Link
                      href="/dashboard/products/new"
                      className="text-xs font-semibold bg-blue-50 hover:bg-blue-100 text-blue-700 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      Add Bangles
                    </Link>
                  </div>
                </motion.div>

                {/* Card 2: Total Stock Items */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.08 }}
                  className="bg-white rounded-2xl border border-[#E5E5E5] hover:border-emerald-400 hover:shadow-lg hover:shadow-emerald-50 transition-all duration-200 p-5 flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider bg-emerald-50 px-2.5 py-0.5 rounded">
                        [PHYSICAL INVENTORY]
                      </span>
                      <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Live Warehouse Units
                      </span>
                    </div>

                    <Link
                      href="/dashboard/products"
                      className="block focus:outline-none"
                    >
                      <div className="flex items-baseline justify-between mt-2">
                        <p className="text-3xl font-black text-[#171717] tracking-tight group-hover:text-emerald-600 transition-colors">
                          {stats?.totalStock || 0} <span className="text-sm font-semibold text-slate-400">units</span>
                        </p>
                        <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                      </div>
                      <p className="text-sm text-[#171717] font-bold mt-1">
                        Physical Stock on Hand {selectedCategory || selectedModelType ? "(Filtered)" : ""}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Total physical count of bangles across all sizes (2.4, 2.6, 2.8) in warehouse
                      </p>
                    </Link>
                  </div>

                  {/* Functional Action Footer */}
                  <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                    <Link
                      href="/dashboard/products"
                      className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 group-hover:underline"
                    >
                      Check Stock & Sizes
                      <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                    </Link>
                    <span className="text-[11px] text-emerald-600 font-medium bg-emerald-50/70 px-2 py-0.5 rounded">
                      In Stock
                    </span>
                  </div>
                </motion.div>

                {/* Card 3: Sold Products & WhatsApp Orders */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="bg-white rounded-2xl border border-[#E5E5E5] hover:border-amber-400 hover:shadow-lg hover:shadow-amber-50 transition-all duration-200 p-5 flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider bg-amber-50 px-2.5 py-0.5 rounded">
                        [SALES VOLUME]
                      </span>
                      <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-100 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                        {stats?.totalOrders || 0} Orders Cleared
                      </span>
                    </div>

                    <Link
                      href="/dashboard/orders"
                      className="block focus:outline-none"
                    >
                      <div className="flex items-baseline justify-between mt-2">
                        <p className="text-3xl font-black text-[#171717] tracking-tight group-hover:text-amber-600 transition-colors">
                          {stats?.itemsSold || 0} <span className="text-sm font-semibold text-slate-400">units sold</span>
                        </p>
                        <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-amber-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                      </div>
                      <p className="text-sm text-[#171717] font-bold mt-1">
                        Completed Customer Sales {selectedCategory || selectedModelType ? "(Filtered)" : ""}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Total units purchased and cleared through WhatsApp & store sales
                      </p>
                    </Link>
                  </div>

                  {/* Functional Action Footer */}
                  <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                    <Link
                      href="/dashboard/orders"
                      className="text-xs font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1 group-hover:underline"
                    >
                      WhatsApp Orders & Bills
                      <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                    </Link>
                    <Link
                      href="/dashboard/orders?action=new-sale"
                      className="text-xs font-semibold bg-amber-50 hover:bg-amber-100 text-amber-700 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1"
                    >
                      Record Sale
                    </Link>
                  </div>
                </motion.div>
              </div>
            )}
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-start gap-3"
            >
              <div className="w-8 h-8 bg-rose-100 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-rose-500 font-bold text-sm">!</span>
              </div>
              <div>
                <p className="font-semibold text-rose-700 text-sm">Connection Error</p>
                <p className="text-rose-600 text-xs mt-1">{error}</p>
                <p className="text-rose-500 text-xs mt-1">Make sure the backend server is running on port 5000.</p>
              </div>
            </motion.div>
          )}

          {/* Recent Products */}
          <div className="pb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-[#171717]">
                  {STRINGS.adminDashboard.recentProductsTitle}
                </h2>
                <p className="text-xs text-slate-500">
                  Review retail pricing, unique product codes, and remaining stock on hand
                </p>
              </div>
              <Link
                href="/dashboard/products"
                className="text-sm text-[#E8436E] hover:text-[#CC3366] font-medium transition-colors flex items-center gap-1.5"
              >
                {STRINGS.adminDashboard.viewAll}
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-white rounded-2xl border border-[#E5E5E5] animate-pulse shadow-sm overflow-hidden">
                    <div className="aspect-[4/3] bg-gray-200" />
                    <div className="p-4 space-y-2.5">
                      <div className="h-5 w-3/4 bg-gray-200 rounded" />
                      <div className="h-3.5 w-1/2 bg-gray-200 rounded" />
                      <div className="h-5 w-1/3 bg-gray-200 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : recentProducts.length === 0 ? (
              <div className="bg-white rounded-2xl border border-[#E5E5E5] p-10 text-center shadow-sm">
                <Package className="w-14 h-14 text-[#D4D4D4] mx-auto mb-4" />
                <p className="text-[#A3A3A3] font-medium text-base">
                  {STRINGS.adminDashboard.noRecentProducts}
                </p>
                <Link
                  href="/dashboard/products/new"
                  className="inline-flex items-center gap-1.5 mt-4 text-sm text-[#E8436E] hover:text-[#CC3366] font-medium transition-colors bg-rose-50 px-5 py-2.5 rounded-xl min-h-[44px]"
                >
                  <PlusCircle className="w-4 h-4" />
                  {STRINGS.products.addFirstProduct}
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {recentProducts.slice(0, 6).map((product, index) => {
                  return (
                    <Link
                      key={product.id}
                      href={`/dashboard/products/${product.id}`}
                    >
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="bg-white rounded-2xl border border-[#E5E5E5] shadow-sm hover:shadow-lg hover:border-[#E8436E]/20 hover:-translate-y-1 transition-all duration-200 group overflow-hidden"
                      >
                        <div className="aspect-[4/3] bg-[#F5F5F5] overflow-hidden relative">
                          <img
                            src={
                              product.image_url ||
                              (typeof product.images?.[0] === 'string' ? product.images[0] : product.images?.[0]?.image_url) ||
                              "https://via.placeholder.com/150"
                            }
                            alt={product.product_name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          {product.unique_code && (
                            <span className="absolute top-2 left-2 bg-slate-900/80 backdrop-blur-sm text-white text-[10px] font-mono font-bold px-2 py-0.5 rounded">
                              Code: {product.unique_code}
                            </span>
                          )}
                        </div>
                        <div className="p-4 space-y-2">
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Design Name</span>
                            <p className="font-bold text-[#171717] text-sm truncate">
                              {product.product_name}
                            </p>
                          </div>
                          <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                            <div>
                              <span className="text-[10px] text-slate-400 font-semibold block">Retail Price</span>
                              <span className="text-base font-extrabold text-[#E8436E]">₹{product.price}</span>
                            </div>
                            <div className="text-right">
                              <span className="text-[10px] text-slate-400 font-semibold block">Stock on Hand</span>
                              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full inline-block ${(product.quantity || 0) > 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                                {(product.quantity || 0) > 0 ? `${product.quantity} units` : 'Out of stock'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
