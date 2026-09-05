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
import { adminApi, type Product, type AnalyticsOverview, type Category, type ModelType } from "@/src/lib/api";
import Link from "next/link";

export default function DashboardPage() {
  const { user } = useAuth();
  const role = (user?.role || "").toLowerCase().trim();
  const isSuperAdmin = role === "super_admin" || role === "superadmin";

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
          adminApi.getOverviewAnalytics(),
          adminApi.getAdminProducts(1, 6),
          adminApi.getCategories(),
          adminApi.getModelTypes(),
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
        const data = await adminApi.getOverviewAnalytics(
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-slate-900 via-rose-950 to-slate-900 rounded-2xl p-6 text-white border border-rose-900/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-md"
      >
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Welcome, {user?.full_name || "Admin"}
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            Real-time bangles catalog management, inventory tracking & WhatsApp order fulfillment.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href="/dashboard/products/new"
            className="flex items-center gap-1.5 bg-[#E8436E] hover:bg-[#CC3366] text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm"
          >
            <PlusCircle className="w-4 h-4" />
            Add New Bangles
          </Link>
          <Link
            href="/dashboard/orders?action=new-sale"
            className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white border border-white/20 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm"
          >
            <ShoppingCart className="w-4 h-4 text-emerald-400" />
            + WhatsApp Sale
          </Link>
        </div>
      </motion.div>

      {/* Overview Stats */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <h2 className="text-lg font-bold text-[#171717]">Catalog & Sales Overview</h2>
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={selectedModelType}
              onChange={(e) => {
                setSelectedModelType(e.target.value);
                setSelectedCategory("");
              }}
              className="text-xs font-semibold px-3 py-2 rounded-xl border border-[#E5E5E5] bg-white text-[#171717] focus:outline-none focus:border-[#E8436E] cursor-pointer shadow-sm"
            >
              <option value="">All Model Types</option>
              {modelTypes.map((mt) => (
                <option key={mt.id} value={mt.id}>{mt.name}</option>
              ))}
            </select>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="text-xs font-semibold px-3 py-2 rounded-xl border border-[#E5E5E5] bg-white text-[#171717] focus:outline-none focus:border-[#E8436E] cursor-pointer shadow-sm"
            >
              <option value="">All Categories</option>
              {filteredCategories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.category_name}</option>
              ))}
            </select>
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
            {/* Card 1: Total Products */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="bg-white rounded-2xl border border-[#E5E5E5] hover:border-blue-400 hover:shadow-lg hover:shadow-blue-50 transition-all duration-200 p-5 flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-11 h-11 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
                    <Package className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                    {stats?.activeProducts ?? stats?.totalProducts ?? 0} Active
                  </span>
                </div>

                <Link
                  href={selectedCategory ? `/dashboard/products?category=${selectedCategory}` : "/dashboard/products"}
                  className="block focus:outline-none"
                >
                  <div className="flex items-baseline justify-between">
                    <p className="text-3xl font-black text-[#171717] tracking-tight group-hover:text-blue-600 transition-colors">
                      {stats?.totalProducts || 0}
                    </p>
                    <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-blue-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                  </div>
                  <p className="text-sm text-[#737373] font-semibold mt-1">
                    Total Products {selectedCategory || selectedModelType ? "(Filtered)" : ""}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Manage full catalog, descriptions & images
                  </p>
                </Link>
              </div>

              {/* Functional Action Footer */}
              <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                <Link
                  href={selectedCategory ? `/dashboard/products?category=${selectedCategory}` : "/dashboard/products"}
                  className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 group-hover:underline"
                >
                  Manage Catalog
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
                <div className="flex items-center justify-between mb-3">
                  <div className="w-11 h-11 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center group-hover:scale-110 group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-sm">
                    <Layers className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    In Stock
                  </span>
                </div>

                <Link
                  href="/dashboard/products"
                  className="block focus:outline-none"
                >
                  <div className="flex items-baseline justify-between">
                    <p className="text-3xl font-black text-[#171717] tracking-tight group-hover:text-emerald-600 transition-colors">
                      {stats?.totalStock || 0}
                    </p>
                    <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                  </div>
                  <p className="text-sm text-[#737373] font-semibold mt-1">
                    Total Stock Items {selectedCategory || selectedModelType ? "(Filtered)" : ""}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Available inventory across all bangle sizes
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
                  Live Stock
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
                <div className="flex items-center justify-between mb-3">
                  <div className="w-11 h-11 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center group-hover:scale-110 group-hover:bg-amber-500 group-hover:text-white transition-all shadow-sm">
                    <ShoppingCart className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-100 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    {stats?.totalOrders || 0} Orders
                  </span>
                </div>

                <Link
                  href="/dashboard/orders"
                  className="block focus:outline-none"
                >
                  <div className="flex items-baseline justify-between">
                    <p className="text-3xl font-black text-[#171717] tracking-tight group-hover:text-amber-600 transition-colors">
                      {stats?.itemsSold || 0}
                    </p>
                    <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-amber-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                  </div>
                  <p className="text-sm text-[#737373] font-semibold mt-1">
                    Sold Products {selectedCategory || selectedModelType ? "(Filtered)" : ""}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Units sold via WhatsApp & store orders
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

        {/* SuperAdmin Quick Revenue & 70/30 Ledger Strip */}
        {isSuperAdmin && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-5 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white rounded-2xl p-5 border border-slate-700 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-[#E8436E] flex items-center justify-center border border-rose-500/30 shrink-0">
                <PieChart className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  70/30 Profit Allocation & Revenue Ledger
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Automated commission split: 70% Product Seller (Admin) • 30% Platform (Super-Admin)
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
              <div className="text-left md:text-right">
                <p className="text-[10px] text-slate-400 uppercase font-semibold">Orders Recorded</p>
                <p className="text-sm font-bold text-emerald-400">
                  {stats?.totalOrders ?? 0} Orders ({stats?.itemsSold ?? 0} Units)
                </p>
              </div>
              <Link
                href="/dashboard/revenue"
                className="inline-flex items-center gap-1.5 bg-[#E8436E] hover:bg-[#CC3366] text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm shrink-0"
              >
                Open Ledger
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </motion.div>
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
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-[#171717]">Recent Products</h2>
          <Link
            href="/dashboard/products"
            className="text-sm text-[#E8436E] hover:text-[#CC3366] font-medium transition-colors flex items-center gap-1.5"
          >
            View All
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
            <p className="text-[#A3A3A3] font-medium text-base">No products found</p>
            <Link
              href="/dashboard/products/new"
              className="inline-flex items-center gap-1.5 mt-4 text-sm text-[#E8436E] hover:text-[#CC3366] font-medium transition-colors bg-rose-50 px-5 py-2.5 rounded-xl"
            >
              <PlusCircle className="w-4 h-4" />
              Add your first product
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
                    <div className="aspect-[4/3] bg-[#F5F5F5] overflow-hidden">
                      <img
                        src={
                          product.image_url ||
                          (typeof product.images?.[0] === 'string' ? product.images[0] : product.images?.[0]?.image_url) ||
                          "https://via.placeholder.com/150"
                        }
                        alt={product.product_name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                    <div className="p-4 space-y-2">
                      <p className="font-semibold text-[#171717] text-sm truncate">
                        {product.product_name}
                      </p>
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-base font-bold text-[#E8436E]">₹{product.price}</span>
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${(product.quantity || 0) > 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>
                          {(product.quantity || 0) > 0 ? `${product.quantity}` : '0'}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
