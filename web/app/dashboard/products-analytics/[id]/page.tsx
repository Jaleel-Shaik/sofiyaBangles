"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { superAdminApi, type ProductAnalyticsDetail } from "@/src/lib/api";
import { ArrowLeft, TrendingUp, DollarSign, Package, ShoppingBag, History, Calendar } from "lucide-react";
import toast from "react-hot-toast";

export default function ProductAnalyticsDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [detail, setDetail] = useState<ProductAnalyticsDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDetail = async () => {
      setLoading(true);
      try {
        const data = await superAdminApi.getProductAnalyticsDetail(id);
        setDetail(data);
      } catch (error) {
        toast.error("Failed to load product analytics detail");
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchDetail();
  }, [id]);

  if (loading) return <div className="p-12 text-center text-slate-500 font-medium">Loading product drilldown analytics...</div>;
  if (!detail) return <div className="p-12 text-center text-rose-500 font-bold">Product analytics record not found.</div>;

  const { product, metrics, salesHistory, stockHistory } = detail;

  return (
    <div className="space-y-6">
      {/* Top Nav */}
      <button
        onClick={() => router.back()}
        className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Products Analytics
      </button>

      {/* Header Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <img
            src={product.image_url || "https://via.placeholder.com/64"}
            alt={product.product_name}
            className="w-16 h-16 rounded-xl object-cover bg-slate-100 border border-slate-200"
          />
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-100">
              Code: {product.unique_code}
            </span>
            <h1 className="text-2xl font-black text-slate-900 mt-1">{product.product_name}</h1>
            <p className="text-xs text-slate-500">
              Category: {product.category_name || "General"} | Price: ₹{product.price}
            </p>
          </div>
        </div>

        <div className="text-right">
          <p className="text-xs text-slate-500">Current Stock</p>
          <p className="text-2xl font-black text-slate-900">{metrics.current_stock} units</p>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-semibold text-slate-500">Gross Revenue</span>
            <DollarSign className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-black text-slate-900">₹{metrics.gross_revenue}</p>
        </div>

        <div className="bg-rose-50 border border-rose-200 p-5 rounded-2xl shadow-sm">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold text-rose-700">SuperAdmin 30%</span>
            <TrendingUp className="w-4 h-4 text-rose-600" />
          </div>
          <p className="text-2xl font-black text-rose-700">₹{metrics.super_admin_share}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-semibold text-slate-500">Admin 70% Share</span>
            <DollarSign className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-black text-slate-900">₹{metrics.admin_share}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-semibold text-slate-500">Units Sold</span>
            <ShoppingBag className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-black text-slate-900">{metrics.units_sold}</p>
        </div>
      </div>

      {/* Grid: Sales History & Stock Audit */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Timeline Table */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-rose-600" /> Sales Timeline History
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase">
                <tr>
                  <th className="p-3">Order Number</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Qty</th>
                  <th className="p-3">Total</th>
                  <th className="p-3 text-rose-600">SuperAdmin 30%</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {salesHistory.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-4 text-center text-slate-400">No sales transactions recorded.</td>
                  </tr>
                ) : (
                  salesHistory.map((s) => (
                    <tr key={s.order_id}>
                      <td className="p-3 font-bold text-slate-900">{s.order_number}</td>
                      <td className="p-3 text-slate-500">{new Date(s.sale_date).toLocaleDateString()}</td>
                      <td className="p-3">{s.quantity}</td>
                      <td className="p-3 font-bold">₹{s.total_amount}</td>
                      <td className="p-3 text-rose-600 font-bold">₹{s.super_admin_share}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Stock Changes Audit Log */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <History className="w-5 h-5 text-slate-700" /> Stock Audit & History Log
          </h2>

          <div className="space-y-3 max-h-96 overflow-y-auto">
            {stockHistory.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">No stock change audit logs found.</p>
            ) : (
              stockHistory.map((log) => (
                <div key={log.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                  <div>
                    <p className="font-bold text-slate-900">{log.action}</p>
                    <p className="text-[10px] text-slate-400">{new Date(log.created_at).toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      log.quantity_change < 0 ? "bg-rose-100 text-rose-800" : "bg-emerald-100 text-emerald-800"
                    }`}>
                      {log.quantity_change > 0 ? `+${log.quantity_change}` : log.quantity_change}
                    </span>
                    <p className="text-[10px] text-slate-500 mt-0.5">New stock: {log.new_quantity}</p>
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
