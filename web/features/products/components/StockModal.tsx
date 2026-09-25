"use client";

import React, { useState, useEffect } from "react";
import { X, Package, Plus, Minus, Loader2, CheckCircle2 } from "lucide-react";
import toast from "react-hot-toast";
import { type Product, api } from "@/src/lib/api";
import { Button } from "@/src/components/ui";

interface StockModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onStockUpdated: (updatedProduct: Product) => void;
}

export function StockModal({ product, isOpen, onClose, onStockUpdated }: StockModalProps) {
  const [totalQuantity, setTotalQuantity] = useState(0);
  const [variantList, setVariantList] = useState<Array<{ id: string; size: string; quantity: number }>>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (product) {
      const safeVariants = Array.isArray(product.variants) ? product.variants : [];
      if (product.has_variants && safeVariants.length > 0) {
        const list = safeVariants.map((v) => ({
          id: v.id || "",
          size: v.size || "Standard",
          quantity: typeof v.quantity === "number" ? v.quantity : parseInt(String(v.quantity || 0), 10) || 0,
        }));
        setVariantList(list);
        const sum = list.reduce((s, item) => s + item.quantity, 0);
        setTotalQuantity(sum || product.quantity || 0);
      } else {
        setVariantList([]);
        setTotalQuantity(typeof product.quantity === "number" ? product.quantity : parseInt(String(product.quantity || 0), 10) || 0);
      }
    }
  }, [product, isOpen]);

  if (!isOpen || !product) return null;

  const handleVariantQuantityChange = (id: string, delta: number) => {
    setVariantList((prev) => {
      const next = prev.map((item) =>
        item.id === id ? { ...item, quantity: Math.max(0, item.quantity + delta) } : item
      );
      setTotalQuantity(next.reduce((s, item) => s + item.quantity, 0));
      return next;
    });
  };

  const handleVariantQuantityDirect = (id: string, val: string) => {
    const num = Math.max(0, parseInt(val, 10) || 0);
    setVariantList((prev) => {
      const next = prev.map((item) => (item.id === id ? { ...item, quantity: num } : item));
      setTotalQuantity(next.reduce((s, item) => s + item.quantity, 0));
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      let updated: Product;
      if (variantList.length > 0) {
        const sum = variantList.reduce((s, item) => s + item.quantity, 0);
        updated = await api.admin.updateStock(product.id, {
          quantity: sum,
          variants: variantList,
        });
      } else {
        updated = await api.admin.updateStock(product.id, totalQuantity);
      }
      toast.success(`Inventory for "${product.product_name}" updated to ${updated.quantity} units!`);
      onStockUpdated(updated);
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || "Failed to update stock");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 space-y-5 animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-[#E8436E]">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Manage Stock & Availability</h2>
              <p className="text-xs text-slate-400 font-mono">
                {product.unique_code || "Stock Controller"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Product Info */}
        <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
          <p className="font-semibold text-sm text-slate-900 truncate">{product.product_name}</p>
          <div className="flex items-center justify-between mt-1 text-xs text-slate-500">
            <span>Price: <strong className="text-slate-800 font-bold">₹{product.price}</strong></span>
            <span
              className={`font-bold px-2 py-0.5 rounded-md ${
                totalQuantity > 5
                  ? "bg-emerald-100 text-emerald-800"
                  : totalQuantity > 0
                  ? "bg-amber-100 text-amber-800"
                  : "bg-rose-100 text-rose-800"
              }`}
            >
              {totalQuantity > 0 ? `${totalQuantity} Available` : "Out of Stock"}
            </span>
          </div>
        </div>

        {/* Variant list or single product stepper */}
        {variantList.length > 0 ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                Size Variants ({variantList.length})
              </span>
              <span className="text-xs font-extrabold text-[#E8436E]">
                Total Stock: {totalQuantity} units
              </span>
            </div>

            <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
              {variantList.map((v) => (
                <div
                  key={v.id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-10 h-7 rounded-lg bg-[#E8436E] text-white text-xs font-black flex items-center justify-center">
                      {v.size}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">Standard size</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleVariantQuantityChange(v.id, -1)}
                      className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-700 hover:bg-slate-100 active:scale-95 transition-transform"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <input
                      type="number"
                      min={0}
                      value={v.quantity}
                      onChange={(e) => handleVariantQuantityDirect(v.id, e.target.value)}
                      className="w-12 text-center text-sm font-bold border border-slate-200 rounded-lg py-1 bg-white focus:outline-none focus:border-[#E8436E]"
                    />
                    <button
                      type="button"
                      onClick={() => handleVariantQuantityChange(v.id, 1)}
                      className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-700 hover:bg-slate-100 active:scale-95 transition-transform"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setTotalQuantity((q) => Math.max(0, q - 1))}
                className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-700 hover:bg-slate-100 shadow-2xs active:scale-95 transition-transform"
              >
                <Minus className="w-4 h-4" />
              </button>

              <div className="text-center">
                <input
                  type="number"
                  min={0}
                  value={totalQuantity}
                  onChange={(e) => setTotalQuantity(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  className="w-20 text-center text-2xl font-black text-slate-900 font-mono bg-transparent border-b border-transparent focus:border-[#E8436E] focus:outline-none"
                />
                <p className="text-[10px] font-bold text-slate-400 uppercase">Available Units</p>
              </div>

              <button
                type="button"
                onClick={() => setTotalQuantity((q) => q + 1)}
                className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-700 hover:bg-slate-100 shadow-2xs active:scale-95 transition-transform"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Presets */}
            <div className="flex gap-2">
              {[5, 10, 25, 50].map((inc) => (
                <button
                  key={inc}
                  type="button"
                  onClick={() => setTotalQuantity((q) => q + inc)}
                  className="flex-1 py-1.5 text-xs font-bold rounded-xl bg-slate-100 text-slate-700 hover:bg-rose-50 hover:text-[#E8436E] border border-slate-200/80 transition-colors"
                >
                  +{inc}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex gap-3 pt-2 border-t border-slate-100">
          <Button variant="outline" size="md" className="flex-1" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="md"
            className="flex-1 bg-[#E8436E] hover:bg-[#D0305B]"
            onClick={handleSave}
            disabled={saving}
            leftIcon={saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
          >
            {saving ? "Saving..." : "Save Stock"}
          </Button>
        </div>
      </div>
    </div>
  );
}
