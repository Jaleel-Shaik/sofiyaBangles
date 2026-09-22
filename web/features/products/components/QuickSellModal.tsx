"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Zap,
  X,
  Search,
  CheckCircle2,
  AlertCircle,
  Package,
  ArrowRight,
  Loader2,
  Share2,
  Minus,
  Plus,
  RefreshCw,
  ShoppingBag,
} from "lucide-react";
import toast from "react-hot-toast";
import { api, type Product } from "@/src/lib/api";

interface QuickSellModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaleSuccess?: (updatedProduct: Product) => void;
  initialCode?: string;
}

export function QuickSellModal({
  isOpen,
  onClose,
  onSaleSuccess,
  initialCode = "",
}: QuickSellModalProps) {
  const router = useRouter();
  const [code, setCode] = useState(initialCode);
  const [lookingUp, setLookingUp] = useState(false);
  const [product, setProduct] = useState<Product | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [selling, setSelling] = useState(false);
  const [completedSale, setCompletedSale] = useState<{
    productName: string;
    code: string;
    qty: number;
    total: number;
    remaining: number;
    phone?: string;
    orderNumber?: string;
  } | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus input when opened
  useEffect(() => {
    if (isOpen) {
      setCode(initialCode);
      setProduct(null);
      setErrorMsg("");
      setQuantity(1);
      setCustomerName("");
      setCustomerPhone("");
      setCompletedSale(null);
      setTimeout(() => inputRef.current?.focus(), 150);

      if (initialCode.trim()) {
        performLookup(initialCode.trim());
      }
    }
  }, [isOpen, initialCode]);

  // Keyboard shortcut listener for Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const performLookup = async (lookupCode: string) => {
    const cleaned = lookupCode.trim().toUpperCase();
    if (!cleaned) {
      setErrorMsg("Please enter a product special ID");
      return;
    }

    setLookingUp(true);
    setErrorMsg("");
    setProduct(null);
    setCompletedSale(null);

    try {
      const found = await api.admin.lookupProductByCode(cleaned);
      setProduct(found);
      setQuantity(1);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        `Product with Special ID '${cleaned}' was not found.`;
      setErrorMsg(msg);
    } finally {
      setLookingUp(false);
    }
  };

  const handleLookupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    performLookup(code);
  };

  const handleSell = async () => {
    if (!product) return;

    if (quantity < 1) {
      toast.error("Quantity must be at least 1");
      return;
    }

    if (quantity > product.quantity) {
      toast.error(`Insufficient stock! Only ${product.quantity} remaining.`);
      return;
    }

    setSelling(true);
    try {
      const updated = await api.admin.sellProductByCode(
        product.unique_code || product.id,
        quantity,
        {
          customer_name: customerName.trim() || undefined,
          customer_phone: customerPhone.trim() || undefined,
        }
      );

      const totalAmount = product.price * quantity;
      const remainingStock = updated.quantity;
      const createdOrder = (updated as any)?.order;
      const orderNumber = createdOrder?.order_number || `ORD-${Date.now().toString().slice(-6)}`;

      setCompletedSale({
        productName: product.product_name,
        code: product.unique_code,
        qty: quantity,
        total: totalAmount,
        remaining: remainingStock,
        phone: customerPhone.trim(),
        orderNumber,
      });

      // Dispatch global product-sold event so Orders page and Dashboard instantly re-render
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("product-sold", {
            detail: {
              product: updated,
              order: createdOrder,
              quantity,
            },
          })
        );
      }

      toast.success(
        `Sold ${quantity} unit(s) of ${product.product_name}! Stock remaining: ${remainingStock}`
      );

      onSaleSuccess?.(updated);
      setProduct(null);
      setCode("");
      setTimeout(() => inputRef.current?.focus(), 200);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to record sale");
    } finally {
      setSelling(false);
    }
  };

  const handleOpenWhatsApp = () => {
    if (!completedSale) return;
    const cleanPhone = (completedSale.phone || "").replace(/[^0-9]/g, "");
    const formattedPhone =
      cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;

    const lines = [
      "✨ *SOFIYA BANGLES — SALE RECEIPT* ✨",
      "━━━━━━━━━━━━━━━━━━━━",
      ...(completedSale.orderNumber ? [`*Order Number:* ${completedSale.orderNumber}`] : []),
      `*Product:* ${completedSale.productName}`,
      `*Product Code:* ${completedSale.code}`,
      `*Quantity:* ${completedSale.qty} set(s)`,
      `*Total Amount:* ₹${completedSale.total}`,
      `*Date:* ${new Date().toLocaleDateString("en-IN")}`,
      "━━━━━━━━━━━━━━━━━━━━",
      "💖 Thank you for shopping with Sofiya Bangles!",
    ];

    const encoded = encodeURIComponent(lines.join("\n"));
    const url = formattedPhone
      ? `https://wa.me/${formattedPhone}?text=${encoded}`
      : `https://wa.me/?text=${encoded}`;
    window.open(url, "_blank");
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden z-10"
        >
          {/* Header Banner */}
          <div className="px-6 pt-5 pb-4 bg-gradient-to-r from-rose-500 via-rose-600 to-pink-600 text-white flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white">
                <Zap className="w-5 h-5 fill-white" />
              </div>
              <div>
                <h2 className="text-base font-bold leading-tight">
                  Quick Sell by Special ID
                </h2>
                <p className="text-xs text-rose-100 font-medium">
                  Enter product code to sell and decrement stock immediately
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-white/20 text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-5">
            {/* Search Input Box */}
            <form onSubmit={handleLookupSubmit} className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                Product Special ID / Code <span className="text-rose-500">*</span>
              </label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    ref={inputRef}
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="e.g. SIL-101, GLA-1001, DES-1002"
                    className="w-full pl-10 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 tracking-wider placeholder:tracking-normal placeholder:font-normal placeholder:text-slate-400 focus:outline-none focus:border-rose-500 focus:bg-white transition-all uppercase"
                  />
                  {code && (
                    <button
                      type="button"
                      onClick={() => {
                        setCode("");
                        setProduct(null);
                        setErrorMsg("");
                        inputRef.current?.focus();
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={lookingUp || !code.trim()}
                  className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
                >
                  {lookingUp ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Find"
                  )}
                </button>
              </div>
            </form>

            {/* Error Message */}
            {errorMsg && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-700 font-medium"
              >
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                <span>{errorMsg}</span>
              </motion.div>
            )}

            {/* Completed Sale Notification Card */}
            {completedSale && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-3"
              >
                <div className="flex items-center justify-between text-emerald-800">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                    <div>
                      <h4 className="text-sm font-bold">Sale Successful & Order Logged!</h4>
                      <p className="text-xs text-emerald-700">
                        Sold {completedSale.qty} unit(s) of {completedSale.productName}.
                      </p>
                    </div>
                  </div>
                  {completedSale.orderNumber && (
                    <span className="text-[10px] font-mono font-bold bg-white px-2 py-0.5 rounded-md border border-emerald-200 text-emerald-900 shadow-xs">
                      {completedSale.orderNumber}
                    </span>
                  )}
                </div>

                <div className="bg-white/80 p-3 rounded-xl border border-emerald-100 flex items-center justify-between text-xs font-semibold text-slate-700">
                  <div>
                    <span className="text-slate-500">Total Billed: </span>
                    <span className="text-emerald-700 font-bold">₹{completedSale.total}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Remaining Stock: </span>
                    <span className="text-slate-900 font-bold">{completedSale.remaining} units</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1 flex-wrap">
                  <button
                    onClick={handleOpenWhatsApp}
                    className="flex-1 min-w-[140px] py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Share2 className="w-3.5 h-3.5" /> Share WhatsApp Bill
                  </button>
                  <button
                    onClick={() => {
                      onClose();
                      router.push("/dashboard/orders");
                    }}
                    className="py-2 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1 transition-colors"
                  >
                    <ShoppingBag className="w-3.5 h-3.5" /> View in Orders
                  </button>
                  <button
                    onClick={() => {
                      setCompletedSale(null);
                      inputRef.current?.focus();
                    }}
                    className="py-2 px-3 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold transition-colors"
                  >
                    Sell Next
                  </button>
                </div>
              </motion.div>
            )}

            {/* Loaded Product Details Card */}
            {product && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4 pt-1"
              >
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex gap-4">
                  {/* Thumbnail */}
                  <div className="w-20 h-20 rounded-xl bg-white border border-slate-200 overflow-hidden flex-shrink-0 flex items-center justify-center">
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.product_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Package className="w-8 h-8 text-slate-300" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs font-black px-2 py-0.5 rounded-md bg-slate-900 text-white tracking-wider">
                        {product.unique_code}
                      </span>
                      {product.quantity > 5 ? (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                          ● {product.quantity} in stock
                        </span>
                      ) : product.quantity > 0 ? (
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md">
                          ⚠️ Low stock: {product.quantity} left
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded-md">
                          ✕ Out of Stock
                        </span>
                      )}
                    </div>

                    <h3 className="text-sm font-bold text-slate-900 truncate">
                      {product.product_name}
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">
                      {product.model_type_name || "Model"} • {product.category_name || "Category"}
                    </p>
                    <p className="text-sm font-black text-rose-600 mt-1">
                      ₹{product.price}
                      <span className="text-[10px] font-normal text-slate-400"> / set</span>
                    </p>
                  </div>
                </div>

                {/* Quantity Selector & Summary */}
                <div className="p-4 rounded-2xl border border-slate-200 bg-white space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-700 block">
                        Quantity to Sell
                      </span>
                      <span className="text-[11px] text-slate-400 font-medium">
                        Remaining after sale: {Math.max(0, product.quantity - quantity)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                        disabled={quantity <= 1}
                        className="w-8 h-8 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 flex items-center justify-center font-bold"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <input
                        type="number"
                        min={1}
                        max={product.quantity}
                        value={quantity}
                        onChange={(e) =>
                          setQuantity(
                            Math.max(
                              1,
                              Math.min(product.quantity || 1, Number(e.target.value) || 1)
                            )
                          )
                        }
                        className="w-14 py-1 text-center font-bold text-slate-900 border border-slate-200 rounded-lg text-sm"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setQuantity((q) => Math.min(product.quantity, q + 1))
                        }
                        disabled={quantity >= product.quantity}
                        className="w-8 h-8 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 flex items-center justify-center font-bold"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-500">Grand Total:</span>
                    <span className="text-base font-black text-slate-900">
                      ₹{product.price * quantity}
                    </span>
                  </div>
                </div>

                {/* Optional Customer info for WhatsApp Bill */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <input
                    type="text"
                    placeholder="Customer Name (optional)"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-rose-500 text-xs font-medium"
                  />
                  <input
                    type="tel"
                    placeholder="WhatsApp No. (optional)"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-rose-500 text-xs font-medium"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setProduct(null);
                      setCode("");
                      inputRef.current?.focus();
                    }}
                    className="py-3 px-4 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSell}
                    disabled={selling || product.quantity <= 0 || quantity > product.quantity}
                    className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-700 hover:to-pink-700 disabled:opacity-50 text-white font-bold text-xs shadow-lg shadow-rose-600/20 flex items-center justify-center gap-2 transition-all"
                  >
                    {selling ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Recording Sale...
                      </>
                    ) : product.quantity <= 0 ? (
                      "Cannot Sell (Out of Stock)"
                    ) : (
                      <>
                        <ShoppingBag className="w-4 h-4" /> Confirm Sale & Deduct Stock
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
