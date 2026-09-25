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
  UserCheck,
  UserPlus,
  Phone,
  ShieldCheck,
} from "lucide-react";
import toast from "react-hot-toast";
import { api, type Product, type User } from "@/src/lib/api";

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

  // Customer verification & account creation state
  const [checkingCustomer, setCheckingCustomer] = useState(false);
  const [verifiedCustomer, setVerifiedCustomer] = useState<User | null>(null);
  const [customerLookupStatus, setCustomerLookupStatus] = useState<"idle" | "found" | "not_found">("idle");
  const [showCreateAccountModal, setShowCreateAccountModal] = useState(false);
  const [newCustName, setNewCustName] = useState("");
  const [newCustPhone, setNewCustPhone] = useState("");
  const [newCustEmail, setNewCustEmail] = useState("");
  const [newCustPassword, setNewCustPassword] = useState("Sofiya@1234");
  const [creatingAccount, setCreatingAccount] = useState(false);

  // Quick Restock state
  const [isRestocking, setIsRestocking] = useState(false);
  const [showCustomRestock, setShowCustomRestock] = useState(false);
  const [customRestockQty, setCustomRestockQty] = useState("");


  const [completedSale, setCompletedSale] = useState<{
    productName: string;
    code: string;
    qty: number;
    total: number;
    remaining: number;
    phone?: string;
    customerName?: string;
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
      setVerifiedCustomer(null);
      setCustomerLookupStatus("idle");
      setShowCreateAccountModal(false);
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
      if (e.key === "Escape" && isOpen && !showCreateAccountModal) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, showCreateAccountModal]);

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

  const handleQuickRestock = async (additionalQty: number) => {
    if (!product) return;
    setIsRestocking(true);
    try {
      const newTotal = (product.quantity || 0) + additionalQty;
      await api.admin.updateStock(product.id, newTotal);
      setProduct((prev: any) => ({ ...prev, quantity: newTotal }));
      setQuantity((q) => q + 1);
      toast.success(`Inventory restocked! Total stock is now ${newTotal} units.`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to update stock");
    } finally {
      setIsRestocking(false);
    }
  };

  const handleCustomRestock = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!product) return;
    const val = parseInt(customRestockQty, 10);
    if (isNaN(val) || val < 0) {
      toast.error("Please enter a valid stock number");
      return;
    }
    setIsRestocking(true);
    try {
      await api.admin.updateStock(product.id, val);
      setProduct((prev: any) => ({ ...prev, quantity: val }));
      if (val > 0) {
        setQuantity((q) => Math.min(val, Math.max(1, q)));
      }
      setShowCustomRestock(false);
      setCustomRestockQty("");
      toast.success(`Stock updated! Total available stock is now ${val} units.`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to update stock");
    } finally {
      setIsRestocking(false);
    }
  };


  const handleCheckCustomer = async (phoneToCheck?: string) => {
    const raw = (phoneToCheck !== undefined ? phoneToCheck : customerPhone).trim();
    const digits = raw.replace(/\D/g, "");
    if (digits.length < 10) {
      setVerifiedCustomer(null);
      setCustomerLookupStatus("idle");
      return;
    }

    setCheckingCustomer(true);
    try {
      const res = await api.admin.lookupCustomerByPhone(raw);
      if (res?.found && res.user) {
        setVerifiedCustomer(res.user);
        setCustomerLookupStatus("found");
        if (res.user.full_name) {
          setCustomerName(res.user.full_name);
        }
      } else {
        setVerifiedCustomer(null);
        setCustomerLookupStatus("not_found");
      }
    } catch {
      setVerifiedCustomer(null);
      setCustomerLookupStatus("not_found");
    } finally {
      setCheckingCustomer(false);
    }
  };

  const handleCreateCustomerAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim()) {
      toast.error("Customer full name is required");
      return;
    }
    const cleanPhone = newCustPhone.trim().replace(/\D/g, "");
    if (cleanPhone.length < 10) {
      toast.error("Valid 10-digit mobile number is required");
      return;
    }
    if (!newCustEmail.trim() || !newCustEmail.includes("@")) {
      toast.error("Valid email address is required");
      return;
    }

    setCreatingAccount(true);
    try {
      const created = await api.admin.createCustomer({
        full_name: newCustName.trim(),
        phone: newCustPhone.trim(),
        email: newCustEmail.trim(),
        password: newCustPassword.trim() || undefined,
      });

      toast.success(`Account created and authorized for ${created.full_name}!`);
      setVerifiedCustomer(created);
      setCustomerLookupStatus("found");
      setCustomerPhone(created.phone || newCustPhone.trim());
      setCustomerName(created.full_name);
      setShowCreateAccountModal(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || "Failed to create customer account");
    } finally {
      setCreatingAccount(false);
    }
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

    // Require Customer Mobile Number to link order to user's mobile app orders list
    if (!customerPhone.trim()) {
      toast.error("Customer mobile number is required to link this order to their mobile app account.");
      return;
    }

    // Strict Authentication: verify customer exists or show popup
    let customerToUse = verifiedCustomer;
    if (!customerToUse) {
      setCheckingCustomer(true);
      try {
        const res = await api.admin.lookupCustomerByPhone(customerPhone.trim());
        if (res?.found && res.user) {
          customerToUse = res.user;
          setVerifiedCustomer(res.user);
          setCustomerLookupStatus("found");
        } else {
          setVerifiedCustomer(null);
          setCustomerLookupStatus("not_found");
          setNewCustPhone(customerPhone.trim());
          setNewCustName(customerName.trim());
          const digits = customerPhone.trim().replace(/\D/g, "").slice(-10);
          setNewCustEmail(`customer_${digits}@sofiyabangles.com`);
          setShowCreateAccountModal(true);
          setCheckingCustomer(false);
          return;
        }
      } catch {
        setCustomerLookupStatus("not_found");
        setNewCustPhone(customerPhone.trim());
        setNewCustName(customerName.trim());
        const digits = customerPhone.trim().replace(/\D/g, "").slice(-10);
        setNewCustEmail(`customer_${digits}@sofiyabangles.com`);
        setShowCreateAccountModal(true);
        setCheckingCustomer(false);
        return;
      }
      setCheckingCustomer(false);
    }

    setSelling(true);
    try {
      const updated = await api.admin.sellProductByCode(
        product.unique_code || product.id,
        quantity,
        {
          customer_name: customerName.trim() || customerToUse?.full_name || undefined,
          customer_phone: customerPhone.trim(),
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
        customerName: customerName.trim() || customerToUse?.full_name,
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
                  className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm shadow-rose-500/25"
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
                <div className="p-4 rounded-2xl bg-white border border-rose-100 shadow-sm flex gap-4">
                  {/* Thumbnail */}
                  <div className="w-20 h-20 rounded-xl bg-rose-50 border border-rose-200 overflow-hidden flex-shrink-0 flex items-center justify-center">
                    {(() => {
                      const imgUrl = product.image_url || (Array.isArray(product.images) && product.images.length > 0 ? (typeof product.images[0] === 'string' ? product.images[0] : product.images[0]?.image_url) : null);
                      return imgUrl ? (
                        <img
                          src={imgUrl}
                          alt={product.product_name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Package className="w-8 h-8 text-rose-300" />
                      );
                    })()}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs font-black px-2 py-0.5 rounded-md bg-indigo-600 text-white tracking-wider shadow-xs">
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
                        Remaining after sale: {Math.max(0, (product.quantity || 0) - quantity)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                        disabled={quantity <= 1}
                        className="w-8 h-8 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 flex items-center justify-center font-bold"
                        title="Decrease quantity"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <input
                        type="number"
                        min={1}
                        max={product.quantity || 1}
                        value={quantity}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          if (!val || val < 1) {
                            setQuantity(1);
                          } else if (val > (product.quantity || 0)) {
                            setQuantity(product.quantity || 1);
                            toast(
                              `Only ${product.quantity} unit(s) in stock. Click [+5 Stock] below to restock inventory!`,
                              { icon: "📦" }
                            );
                          } else {
                            setQuantity(val);
                          }
                        }}
                        className="w-14 py-1 text-center font-bold text-slate-900 border border-slate-200 rounded-lg text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (quantity >= (product.quantity || 0)) {
                            toast(
                              `Cannot increase further. Max available stock is ${product.quantity}. Use [+5 Stock] below to add inventory!`,
                              { icon: "📦" }
                            );
                            return;
                          }
                          setQuantity((q) => Math.min(product.quantity || 1, q + 1));
                        }}
                        disabled={quantity >= (product.quantity || 0) && (product.quantity || 0) > 0}
                        className="w-8 h-8 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 flex items-center justify-center font-bold"
                        title={quantity >= (product.quantity || 0) ? `Max stock (${product.quantity}) reached` : "Increase quantity"}
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Stock Limit Notice & Quick Restock Shortcut */}
                  {(quantity >= (product.quantity || 0) || (product.quantity || 0) <= 2) && (
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-1.5 text-slate-600 font-medium">
                          <Package className="w-3.5 h-3.5 text-slate-400" />
                          <span>
                            {(product.quantity || 0) <= 0 ? (
                              <strong className="text-rose-600">Out of Stock (0 units)</strong>
                            ) : quantity >= (product.quantity || 0) ? (
                              <span>
                                Max stock reached (<strong>{product.quantity} left</strong>)
                              </span>
                            ) : (
                              <span>
                                Low stock (<strong>{product.quantity} left</strong>)
                              </span>
                            )}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleQuickRestock(5)}
                            disabled={isRestocking}
                            className="px-2.5 py-1 text-[11px] font-bold text-rose-600 bg-white hover:bg-rose-50 border border-rose-200 rounded-lg transition-colors flex items-center gap-1 shadow-2xs"
                          >
                            {isRestocking ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                            +5 Stock
                          </button>
                          <button
                            type="button"
                            onClick={() => handleQuickRestock(10)}
                            disabled={isRestocking}
                            className="px-2.5 py-1 text-[11px] font-bold text-rose-600 bg-white hover:bg-rose-50 border border-rose-200 rounded-lg transition-colors shadow-2xs"
                          >
                            +10 Stock
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowCustomRestock(!showCustomRestock)}
                            className="px-2 py-1 text-[11px] font-bold text-slate-600 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
                          >
                            Custom
                          </button>
                        </div>
                      </div>

                      {showCustomRestock && (
                        <div className="pt-2 border-t border-slate-200 flex items-center gap-2">
                          <input
                            type="number"
                            min={0}
                            placeholder="Set total stock..."
                            value={customRestockQty}
                            onChange={(e) => setCustomRestockQty(e.target.value)}
                            className="flex-1 px-2.5 py-1 text-xs border border-slate-200 rounded-lg bg-white font-bold"
                          />
                          <button
                            type="button"
                            onClick={() => handleCustomRestock()}
                            disabled={isRestocking}
                            className="px-3 py-1 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 disabled:opacity-50"
                          >
                            {isRestocking ? "Updating..." : "Set Stock"}
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="pt-3 border-t border-rose-100 bg-gradient-to-r from-rose-50 via-pink-50 to-amber-50/40 rounded-xl p-3 flex items-center justify-between text-xs">
                    <span className="font-semibold text-rose-900">Total Payable:</span>
                    <span className="text-base font-black text-rose-600">
                      ₹{product.price * quantity}
                    </span>
                  </div>
                </div>

                {/* Customer Authentication & Order Linking Section */}
                <div className="p-4 rounded-2xl border border-rose-100 bg-rose-50/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-rose-600" />
                      <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                        Customer Account (Mobile App Sync)
                      </span>
                    </div>
                    {customerLookupStatus === "found" && verifiedCustomer ? (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <UserCheck className="w-3 h-3" /> Authorized Customer
                      </span>
                    ) : customerLookupStatus === "not_found" ? (
                      <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> Account Required
                      </span>
                    ) : null}
                  </div>

                  <div className="space-y-2.5">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        Customer Mobile Number <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="tel"
                          placeholder="e.g. 9876543210 (10 digits)"
                          value={customerPhone}
                          onChange={(e) => {
                            const val = e.target.value;
                            setCustomerPhone(val);
                            if (val.replace(/\D/g, "").length >= 10) {
                              handleCheckCustomer(val);
                            } else {
                              setVerifiedCustomer(null);
                              setCustomerLookupStatus("idle");
                            }
                          }}
                          onBlur={() => handleCheckCustomer()}
                          className="w-full pl-9 pr-24 py-2 bg-white rounded-xl border border-rose-200 text-xs font-bold text-slate-900 focus:outline-none focus:border-rose-500"
                        />
                        <button
                          type="button"
                          onClick={() => handleCheckCustomer()}
                          disabled={checkingCustomer || customerPhone.replace(/\D/g, "").length < 10}
                          className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 shadow-xs"
                        >
                          {checkingCustomer ? <Loader2 className="w-3 h-3 animate-spin" /> : "Verify"}
                        </button>
                      </div>
                    </div>

                    {/* Customer Verified Banner */}
                    {customerLookupStatus === "found" && verifiedCustomer && (
                      <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                          <div>
                            <p className="font-bold text-xs">{verifiedCustomer.full_name}</p>
                            <p className="text-[10px] text-emerald-600">
                              {verifiedCustomer.email} • {verifiedCustomer.phone || customerPhone}
                            </p>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold bg-white px-2 py-0.5 rounded border border-emerald-200 text-emerald-700 shadow-2xs">
                          Mobile App Linked
                        </span>
                      </div>
                    )}

                    {/* Customer Not Found Warning & Popup Trigger */}
                    {customerLookupStatus === "not_found" && (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-2">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <p className="font-bold">Unregistered Customer Account</p>
                            <p className="text-[11px] text-amber-700 leading-snug">
                              Only authenticated and authorized users can purchase products. No account was found for mobile number <strong>{customerPhone}</strong>.
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setNewCustPhone(customerPhone.trim());
                            setNewCustName(customerName.trim());
                            const d = customerPhone.trim().replace(/\D/g, "").slice(-10);
                            setNewCustEmail(`customer_${d}@sofiyabangles.com`);
                            setShowCreateAccountModal(true);
                          }}
                          className="w-full py-2 px-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors"
                        >
                          <UserPlus className="w-3.5 h-3.5" /> Create Customer Account to Authorize Sale
                        </button>
                      </div>
                    )}

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        Customer Full Name
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Priya Sharma"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        className="w-full p-2 bg-white rounded-xl border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:border-rose-500"
                      />
                    </div>
                  </div>
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
                    ) : customerLookupStatus === "not_found" ? (
                      <>
                        <UserPlus className="w-4 h-4" /> Account Required — Click to Create
                      </>
                    ) : (
                      <>
                        <ShoppingBag className="w-4 h-4" /> Confirm Sale & Link Order
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            )}
          </div>

          {/* Create Customer Account Popup Modal */}
          <AnimatePresence>
            {showCreateAccountModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden p-6 space-y-4"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center">
                        <UserPlus className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">Create & Authorize Customer Account</h3>
                        <p className="text-[11px] text-slate-500">Required before selling so order appears in mobile app</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowCreateAccountModal(false)}
                      className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <form onSubmit={handleCreateCustomerAccount} className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Customer Full Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Priya Sharma"
                        value={newCustName}
                        onChange={(e) => setNewCustName(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-rose-500 focus:bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Mobile Number <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="tel"
                        required
                        placeholder="e.g. 9876543210"
                        value={newCustPhone}
                        onChange={(e) => setNewCustPhone(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-rose-500 focus:bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Email Address <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="e.g. priya@gmail.com"
                        value={newCustEmail}
                        onChange={(e) => setNewCustEmail(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-rose-500 focus:bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Initial Password
                      </label>
                      <input
                        type="password"
                        placeholder="Default: Sofiya@1234"
                        value={newCustPassword}
                        onChange={(e) => setNewCustPassword(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-rose-500 focus:bg-white"
                      />
                    </div>

                    <div className="pt-2 flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setShowCreateAccountModal(false)}
                        className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-xs font-bold"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={creatingAccount}
                        className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm"
                      >
                        {creatingAccount ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserCheck className="w-3.5 h-3.5" />}
                        Register & Authorize Customer
                      </button>
                    </div>
                  </form>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
