"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ShoppingBag, ArrowLeft, CheckCircle, RefreshCw, Shield, User, MapPin } from "lucide-react";
import toast from "react-hot-toast";
import { api } from "@/src/lib/api";
import { AdminOrder, AdminOrderItem } from "@/src/lib/api/types";

export default function SaleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [sale, setSale] = useState<AdminOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [refundReason, setRefundReason] = useState("");
  const [showRefundModal, setShowRefundModal] = useState(false);

  const fetchSaleDetail = async () => {
    setLoading(true);
    try {
      const data = await api.superAdmin.getSaleDetail(id);
      setSale(data);
    } catch (error) {
      toast.error("Failed to load sale details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchSaleDetail();
  }, [id]);

  const handleCompleteOrder = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await api.superAdmin.completeOrder(id);
      toast.success("Order completed and 70/30 revenue allocated!");
      fetchSaleDetail();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to complete order.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRefundOrder = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await api.superAdmin.refundOrder(id, refundReason || "SuperAdmin manual refund");
      toast.success("Order refunded and revenue reversed!");
      setShowRefundModal(false);
      fetchSaleDetail();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to refund order.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-slate-500 font-medium">Loading sale detail...</div>;
  }

  if (!sale) {
    return <div className="p-12 text-center text-rose-500 font-bold">Sale record not found.</div>;
  }

  const isCompleted = sale.status === "completed";
  const isRefunded = sale.payment_status === "refunded";

  return (
    <div className="space-y-6">
      {/* Top Nav */}
      <button
        onClick={() => router.back()}
        className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Sales
      </button>

      {/* Sale Card Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-slate-900">{sale.order_number}</h1>
            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
              isCompleted ? "bg-emerald-100 text-emerald-800" :
              isRefunded ? "bg-rose-100 text-rose-800" :
              "bg-amber-100 text-amber-800"
            }`}>
              {isRefunded ? "Refunded" : sale.status}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">Placed on {new Date(sale.created_at).toLocaleString()}</p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          {!isCompleted && !isRefunded && (
            <button
              onClick={handleCompleteOrder}
              disabled={submitting}
              className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-colors disabled:opacity-50"
            >
              <CheckCircle className="w-4 h-4" /> Complete Order & Allocate Revenue
            </button>
          )}

          {!isRefunded && (
            <button
              onClick={() => setShowRefundModal(true)}
              disabled={submitting}
              className="inline-flex items-center gap-2 bg-rose-600 hover:bg-rose-500 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-colors disabled:opacity-50"
            >
              <RefreshCw className="w-4 h-4" /> Process Refund Reversal
            </button>
          )}
        </div>
      </div>

      {/* 70/30 Financial Allocation Card */}
      <div className="bg-gradient-to-r from-slate-900 via-rose-950 to-slate-900 p-6 rounded-2xl text-white shadow-lg border border-rose-900/40">
        <h2 className="text-sm font-bold uppercase text-rose-300 tracking-wider mb-4 flex items-center gap-2">
          <Shield className="w-4 h-4" /> 70/30 Revenue Commission Breakdown
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="bg-white/10 backdrop-blur p-4 rounded-xl border border-white/10">
            <p className="text-xs text-slate-300 font-medium">Total Gross Order Amount</p>
            <p className="text-2xl font-black mt-1">₹{sale.total_amount}</p>
          </div>

          <div className="bg-emerald-500/20 backdrop-blur p-4 rounded-xl border border-emerald-500/30">
            <p className="text-xs text-emerald-300 font-semibold">Admin Share (70%)</p>
            <p className="text-2xl font-black text-emerald-300 mt-1">₹{sale.admin_share}</p>
          </div>

          <div className="bg-rose-500/20 backdrop-blur p-4 rounded-xl border border-rose-500/30">
            <p className="text-xs text-rose-300 font-semibold">SuperAdmin Share (30%)</p>
            <p className="text-2xl font-black text-rose-300 mt-1">₹{sale.super_admin_share}</p>
          </div>
        </div>
      </div>

      {/* Grid: Order Items & Customer Snapshot */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Purchased Items List */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-rose-600" /> Order Items ({sale.items?.length || 0})
          </h2>

          <div className="divide-y divide-slate-100">
            {sale.items?.map((item: AdminOrderItem) => (
              <div key={item.id} className="py-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-bold text-slate-900">{item.product_name_snapshot}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Category: {item.category_name_snapshot || "General"} | SKU: {item.sku_snapshot || "N/A"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-slate-900">₹{item.price_snapshot} × {item.quantity}</p>
                  <p className="text-xs font-black text-rose-600">Subtotal: ₹{item.subtotal}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Customer Address Snapshot */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <User className="w-5 h-5 text-slate-700" /> Customer Information
          </h2>

          {sale.shipping_address_snapshot ? (
            <div className="text-xs space-y-2 text-slate-700 font-medium">
              <p className="font-bold text-sm text-slate-900">{sale.shipping_address_snapshot.name}</p>
              <p className="flex items-center gap-1.5 text-slate-600">
                <MapPin className="w-4 h-4 text-slate-400" /> {sale.shipping_address_snapshot.address_line_1}
              </p>
              <p className="pl-5 text-slate-600">
                {sale.shipping_address_snapshot.city}, {sale.shipping_address_snapshot.state} - {sale.shipping_address_snapshot.postal_code}
              </p>
              <p className="pl-5 font-bold text-slate-900">Phone: {sale.shipping_address_snapshot.phone}</p>
            </div>
          ) : (
            <p className="text-xs text-slate-400">Standard checkout order (No shipping address attached).</p>
          )}
        </div>
      </div>

      {/* Refund Modal */}
      {showRefundModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white p-6 rounded-2xl max-w-md w-full space-y-4 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900">Initiate Refund Reversal</h3>
            <p className="text-xs text-slate-500">
              This will update the order status to refunded and create negative reversal ledger entries in the financial record.
            </p>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Reason for Refund</label>
              <input
                type="text"
                placeholder="e.g. Defective item, Customer cancellation..."
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                className="w-full text-xs p-3 border border-slate-200 rounded-xl focus:outline-none focus:border-rose-500"
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowRefundModal(false)}
                className="px-4 py-2 border border-slate-200 text-xs font-bold text-slate-600 rounded-xl hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleRefundOrder}
                disabled={submitting}
                className="px-4 py-2 bg-rose-600 text-white text-xs font-bold rounded-xl hover:bg-rose-500 disabled:opacity-50"
              >
                Confirm Refund
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
