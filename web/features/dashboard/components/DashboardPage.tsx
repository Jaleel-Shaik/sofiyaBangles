"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/features/auth/lib/auth-context";
import { motion } from "framer-motion";
import {
  Package,
  Layers,
  ShoppingBag,
  PlusCircle,
  ArrowRight,
  ShoppingCart,
} from "lucide-react";
import { adminApi, type Product, type AnalyticsOverview, type Category } from "@/src/lib/api";
import Link from "next/link";

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<AnalyticsOverview | null>(null);
  const [recentProducts, setRecentProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setError(null);
      try {
        const [analyticsData, productsData, cats] = await Promise.all([
          adminApi.getOverviewAnalytics(),
          adminApi.getAdminProducts(1, 5),
          adminApi.getCategories(),
        ]);
        setStats(analyticsData);
        setRecentProducts(productsData.products || []);
        setCategories(cats);
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-rose-50 to-pink-50 rounded-2xl p-6 border border-rose-100"
      >
        <p className="text-[#C25B3E] font-medium text-xs uppercase tracking-wider mb-0.5">
          Admin Panel
        </p>
        <h1 className="text-2xl font-bold text-rose-700">
          Welcome, {user?.full_name || "Admin"}
        </h1>
      </motion.div>

      {/* Overview Stats */}
      <div>
        <h2 className="text-lg font-bold text-[#171717] mb-4">Overview</h2>
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[1, 2].map((i) => (
              <div key={i} className="bg-white rounded-2xl border border-[#E5E5E5] p-5 animate-pulse">
                <div className="w-10 h-10 bg-gray-200 rounded-xl mb-3" />
                <div className="h-7 w-20 bg-gray-200 rounded mb-2" />
                <div className="h-4 w-24 bg-gray-200 rounded" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="bg-white rounded-2xl border border-[#E5E5E5] p-5 hover:shadow-md transition-shadow"
            >
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center mb-3">
                <Package className="w-5 h-5 text-blue-500" />
              </div>
              <p className="text-2xl font-bold text-[#171717]">
                {stats?.totalProducts || 0}
              </p>
              <p className="text-sm text-[#A3A3A3] font-medium mt-1">
                Total Products
              </p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-2xl border border-[#E5E5E5] p-5 hover:shadow-md transition-shadow"
            >
              <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center mb-3">
                <ShoppingCart className="w-5 h-5 text-amber-500" />
              </div>
              <p className="text-2xl font-bold text-[#171717]">
                {stats?.itemsSold || 0}
              </p>
              <p className="text-sm text-[#A3A3A3] font-medium mt-1">
                Sold Products
              </p>
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

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-bold text-[#171717] mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link
            href="/dashboard/products/new"
            className="bg-[#E8436E] text-white rounded-2xl p-5 hover:bg-[#CC3366] transition-all hover:shadow-lg hover:shadow-[#E8436E]/20 active:scale-[0.98] flex flex-col"
          >
            <PlusCircle className="w-6 h-6 mb-3" />
            <p className="font-bold text-base">Add Product</p>
            <p className="text-xs text-white/70 mt-1">Create a new product</p>
          </Link>
          <Link
            href="/dashboard/products"
            className="bg-white rounded-2xl border border-[#E5E5E5] p-5 hover:shadow-md transition-all active:scale-[0.98] flex flex-col"
          >
            <Package className="w-6 h-6 text-[#E8436E] mb-3" />
            <p className="font-bold text-[#171717]">Manage</p>
            <p className="text-xs text-[#A3A3A3] mt-1">View all products</p>
          </Link>
          <Link
            href="/dashboard/categories"
            className="bg-white rounded-2xl border border-[#E5E5E5] p-5 hover:shadow-md transition-all active:scale-[0.98] flex flex-col"
          >
            <ShoppingBag className="w-6 h-6 text-amber-500 mb-3" />
            <p className="font-bold text-[#171717]">Categories</p>
            <p className="text-xs text-[#A3A3A3] mt-1">Manage categories</p>
          </Link>
          <Link
            href="/dashboard/model-types"
            className="bg-white rounded-2xl border border-[#E5E5E5] p-5 hover:shadow-md transition-all active:scale-[0.98] flex flex-col"
          >
            <Layers className="w-6 h-6 text-purple-500 mb-3" />
            <p className="font-bold text-[#171717]">Model Types</p>
            <p className="text-xs text-[#A3A3A3] mt-1">Manage model types</p>
          </Link>
        </div>
      </div>

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
