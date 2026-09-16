"use client";

import { useState, useEffect } from "react";
import { Package, Download, TrendingUp } from "lucide-react";
import Link from "next/link";
import { api } from "@/src/lib/api";
import { ProductAnalyticsItem } from "@/src/lib/api/types";
import { STRINGS } from "@/src/constants/strings";

type ProductAnalyticsTab = "all" | "best_sellers" | "low_stock" | "out_of_stock" | "unsold";

export default function ProductsAnalyticsPage() {
  const [products, setProducts] = useState<ProductAnalyticsItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [tab, setTab] = useState<ProductAnalyticsTab>("all");
  const [loading, setLoading] = useState(true);

  const analyticsTabs: Array<{ id: ProductAnalyticsTab; label: string }> = [
    { id: "all", label: STRINGS.productsAnalytics.tabAll },
    { id: "best_sellers", label: STRINGS.productsAnalytics.tabBestSellers },
    { id: "low_stock", label: STRINGS.productsAnalytics.tabLowStock },
    { id: "out_of_stock", label: STRINGS.productsAnalytics.tabOutOfStock },
    { id: "unsold", label: STRINGS.productsAnalytics.tabUnsold },
  ];

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
            <Package className="w-6 h-6 text-rose-600" /> {STRINGS.productsAnalytics.title}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {STRINGS.productsAnalytics.subtitle}
          </p>
        </div>

        <a
          href={api.superAdmin.exportProductsCsvUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 min-h-[44px] rounded-xl text-xs font-semibold transition-colors"
        >
          <Download className="w-4 h-4" /> {STRINGS.productsAnalytics.exportCsv}
        </a>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto pb-1">
        {analyticsTabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 min-h-[44px] text-xs font-bold rounded-xl transition-all whitespace-nowrap ${
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
          <div className="p-8 text-center text-slate-400 text-sm">{STRINGS.productsAnalytics.loading}</div>
        ) : filteredProducts.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm font-medium">{STRINGS.productsAnalytics.empty}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-bold">
                <tr>
                  <th className="p-4">{STRINGS.productsAnalytics.tableProduct}</th>
                  <th className="p-4">{STRINGS.productsAnalytics.tableCode}</th>
                  <th className="p-4">{STRINGS.productsAnalytics.tablePrice}</th>
                  <th className="p-4">{STRINGS.productsAnalytics.tableStock}</th>
                  <th className="p-4">{STRINGS.productsAnalytics.tableGrossRevenue}</th>
                  <th className="p-4 text-emerald-600">{STRINGS.productsAnalytics.tableAdminShare}</th>
                  <th className="p-4 text-rose-600">{STRINGS.productsAnalytics.tableSuperAdminShare}</th>
                  <th className="p-4 text-right">{STRINGS.productsAnalytics.tableDrilldown}</th>
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
                        {p.quantity || 0} {STRINGS.productsAnalytics.leftSuffix}
                      </span>
                    </td>
                    <td className="p-4 font-bold text-slate-900">₹{p.gross_revenue || 0}</td>
                    <td className="p-4 text-emerald-600 font-bold">₹{p.admin_share || 0}</td>
                    <td className="p-4 text-rose-600 font-bold">₹{p.super_admin_share || 0}</td>
                    <td className="p-4 text-right">
                      <Link
                        href={`/dashboard/products-analytics/${p.id}`}
                        className="inline-flex items-center gap-1 text-rose-600 hover:text-rose-700 font-bold py-1 px-2 rounded-lg hover:bg-rose-50 min-h-[36px]"
                      >
                        <TrendingUp className="w-3.5 h-3.5" /> {STRINGS.productsAnalytics.drilldownAction}
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
