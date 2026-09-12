"use client";

import { useState, useEffect } from "react";
import { Package, Search, Download, Eye, TrendingUp } from "lucide-react";
import Link from "next/link";
import { api } from "@/src/lib/api";

export default function ProductsAnalyticsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [tab, setTab] = useState<"all" | "best_sellers" | "low_stock" | "out_of_stock" | "unsold">("all");
  const [loading, setLoading] = useState(true);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await api.superAdmin.getProductsAnalytics({ page, limit: 15 });
      setProducts(res.products || []);
      setTotal(res.total || 0);
    } catch (error) {
      console.error("Failed to load products analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [page]);

  const filteredProducts = products.filter((p) => {
    if (tab === "best_sellers") return (p.gross_revenue || 0) > 0;
    if (tab === "low_stock") return (p.quantity || 0) > 0 && (p.quantity || 0) <= 10;
    if (tab === "out_of_stock") return (p.quantity || 0) === 0;
    if (tab === "unsold") return (p.gross_revenue || 0) === 0;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Package className="w-6 h-6 text-rose-600" /> Products Financial Analytics
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Individual product sales, stock levels, and SuperAdmin 30% revenue share breakdown.
          </p>
        </div>

        <a
          href={api.superAdmin.exportProductsCsvUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 rounded-xl text-xs font-semibold transition-colors"
        >
          <Download className="w-4 h-4" /> Export Products CSV
        </a>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto pb-1">
        {[
          { id: "all", label: "All Products" },
          { id: "best_sellers", label: "Best Sellers" },
          { id: "low_stock", label: "Low Stock Alert" },
          { id: "out_of_stock", label: "Out of Stock" },
          { id: "unsold", label: "Unsold Items" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as any)}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap ${
              tab === t.id
                ? "bg-rose-600 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-400 text-sm">Loading product analytics...</div>
        ) : filteredProducts.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm font-medium">No products match this filter.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-bold">
                <tr>
                  <th className="p-4">Product</th>
                  <th className="p-4">Code</th>
                  <th className="p-4">Price</th>
                  <th className="p-4">Stock</th>
                  <th className="p-4">Gross Revenue</th>
                  <th className="p-4 text-emerald-600">Admin 70%</th>
                  <th className="p-4 text-rose-600">SuperAdmin 30%</th>
                  <th className="p-4 text-right">Drilldown</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredProducts.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-4 flex items-center gap-3">
                      <img
                        src={p.image_url || "https://via.placeholder.com/40"}
                        alt={p.product_name}
                        className="w-10 h-10 rounded-lg object-cover bg-slate-100"
                      />
                      <div>
                        <p className="font-bold text-slate-900">{p.product_name}</p>
                        <p className="text-[10px] text-slate-400">{p.category_name || "General"}</p>
                      </div>
                    </td>
                    <td className="p-4 font-mono text-slate-500">{p.unique_code}</td>
                    <td className="p-4 font-bold text-slate-900">₹{p.price}</td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        (p.quantity || 0) === 0 ? "bg-rose-100 text-rose-800" :
                        (p.quantity || 0) <= 10 ? "bg-amber-100 text-amber-800" :
                        "bg-emerald-100 text-emerald-800"
                      }`}>
                        {p.quantity || 0} left
                      </span>
                    </td>
                    <td className="p-4 font-bold text-slate-900">₹{p.gross_revenue || 0}</td>
                    <td className="p-4 text-emerald-600 font-bold">₹{p.admin_share || 0}</td>
                    <td className="p-4 text-rose-600 font-bold">₹{p.super_admin_share || 0}</td>
                    <td className="p-4 text-right">
                      <Link
                        href={`/dashboard/products-analytics/${p.id}`}
                        className="inline-flex items-center gap-1 text-rose-600 hover:text-rose-700 font-bold"
                      >
                        <TrendingUp className="w-3.5 h-3.5" /> Drilldown
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
