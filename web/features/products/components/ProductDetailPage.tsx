"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Edit,
  Trash2,
  Package,
  Loader2,
  ShoppingCart,
  Minus,
  Plus,
  UserCheck,
  UserX,
  UserPlus,
  Phone,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  X,
  Share2,
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import { type Product, api } from "@/src/lib/api";
import { Button, Badge, Card, CardContent, CardHeader, CardTitle, ConfirmDialog, AuthenticatedImage } from "@/src/components/ui";
import { STRINGS } from "@/src/constants/strings";
import { StockModal } from "./StockModal";

export default function ProductDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = params.id as string;
  const rawQty = searchParams?.get("qty");
  const action = searchParams?.get("action");
  const orderNumber = searchParams?.get("orderNumber");
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [sellQty, setSellQty] = useState(() => (rawQty ? Math.max(1, parseInt(rawQty, 10) || 1) : 1));
  const [selling, setSelling] = useState(false);
  const [stockModalOpen, setStockModalOpen] = useState(false);

  // Customer identification for mobile app sync
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [checkingCustomer, setCheckingCustomer] = useState(false);
  const [verifiedCustomer, setVerifiedCustomer] = useState<{
    id: string;
    full_name?: string;
    phone?: string;
    email?: string;
  } | null>(null);
  const [customerLookupStatus, setCustomerLookupStatus] = useState<
    "idle" | "found" | "not_found"
  >("idle");

  // Popup modal state for creating customer account
  const [showCreateAccountModal, setShowCreateAccountModal] = useState(false);
  const [creatingAccount, setCreatingAccount] = useState(false);
  const [newCustName, setNewCustName] = useState("");
  const [newCustPhone, setNewCustPhone] = useState("");
  const [newCustEmail, setNewCustEmail] = useState("");
  const [newCustPassword, setNewCustPassword] = useState("");

  // ConfirmDialog state
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Completed sale receipt state
  const [completedSale, setCompletedSale] = useState<{
    productName: string;
    code: string;
    qty: number;
    total: number;
    remaining: number;
    phone: string;
    customerName?: string;
    orderNumber?: string;
  } | null>(null);

  useEffect(() => {
    if (rawQty) {
      const parsed = parseInt(rawQty, 10);
      if (parsed && parsed >= 1) setSellQty(parsed);
    }
  }, [rawQty]);

  const fetchProduct = async () => {
    try {
      const prod = await api.admin.getProductById(id);
      setProduct(prod);
    } catch {
      toast.error("Failed to load product");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProduct();
  }, [id]);

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

  // If orderNumber is present in URL, try to pre-populate customer details from the order
  useEffect(() => {
    if (!orderNumber) return;
    api.superAdmin
      .getOrders({ search: orderNumber })
      .then((res) => {
        const matched = res.orders?.find((o) => o.order_number === orderNumber);
        if (matched) {
          if (matched.customer_phone) {
            setCustomerPhone(matched.customer_phone);
            handleCheckCustomer(matched.customer_phone);
          }
          if (matched.customer_name) {
            setCustomerName(matched.customer_name);
          }
        }
      })
      .catch(() => {});
  }, [orderNumber]);

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

  const handleDeleteConfirm = async () => {
    if (!product) return;
    setDeleting(true);
    try {
      await api.admin.deleteProduct(product.id);
      toast.success(STRINGS.products.deletedSuccess);
      setConfirmDeleteOpen(false);
      router.push("/dashboard/products");
    } catch {
      toast.error("Failed to delete product");
    } finally {
      setDeleting(false);
    }
  };

  const handleSell = async () => {
    if (selling || !product) return;
    if (sellQty < 1) {
      toast.error("Quantity must be at least 1");
      return;
    }
    if (sellQty > product.quantity) {
      toast.error("Not enough stock");
      return;
    }

    // Require Customer Mobile Number to link order to user's mobile app orders list
    if (!customerPhone.trim()) {
      toast.error("Customer mobile number is required to link this sale to their mobile app account.");
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
      const extraNotes = orderNumber ? `WhatsApp Order #${orderNumber}` : undefined;
      const updated = await api.admin.sellProduct(product.id, sellQty, {
        customer_name: customerName.trim() || customerToUse?.full_name || undefined,
        customer_phone: customerPhone.trim(),
        notes: extraNotes,
        order_number: orderNumber || undefined,
      });
      const createdOrder = (updated as any)?.order;
      const loggedOrderNumber = orderNumber || createdOrder?.order_number || `ORD-${Date.now().toString().slice(-6)}`;
      setCompletedSale({
        productName: product.product_name,
        code: product.unique_code || "ITEM",
        qty: sellQty,
        total: product.price * sellQty,
        remaining: updated.quantity,
        phone: customerPhone.trim(),
        customerName: customerName.trim() || customerToUse?.full_name,
        orderNumber: loggedOrderNumber,
      });

      setProduct(updated);
      setSellQty(1);
      toast.success(
        orderNumber
          ? `Order #${orderNumber} fulfilled for ${customerToUse?.full_name || customerPhone}! Order synced to customer app.`
          : `Sold ${sellQty} unit(s) to ${customerToUse?.full_name || customerPhone}! Order synced to customer app.`
      );
    } catch (e: any) {
      toast.error(e?.response?.data?.message || e?.message || "Failed to sell product");
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
      ...(completedSale.customerName ? [`*Customer:* ${completedSale.customerName}`] : []),
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

  if (loading) {
    return (
      <div className="flex justify-center items-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-[#E8436E]" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="text-center py-24 text-slate-400 font-medium">
        Product not found
      </div>
    );
  }

  const isOutOfStock = product.quantity <= 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* WhatsApp Order Action Banner */}
      {action === "sell" && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#E8436E] text-white flex items-center justify-center shrink-0 shadow-xs">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">
                WhatsApp Purchase Order Fulfillment
                {orderNumber ? (
                  <span className="ml-2 font-mono text-xs px-2 py-0.5 rounded-md bg-white border border-rose-200 text-rose-700 font-semibold">
                    {orderNumber}
                  </span>
                ) : null}
              </p>
              <p className="text-xs text-slate-600 mt-0.5">
                Review available stock and complete the sale below to fulfill this customer order.
              </p>
            </div>
          </div>
          {orderNumber && (
            <Link
              href={`/dashboard/orders?orderNumber=${encodeURIComponent(orderNumber)}`}
              className="text-xs font-semibold text-[#E8436E] hover:underline shrink-0 self-start sm:self-auto flex items-center gap-1"
            >
              View Order in Dashboard →
            </Link>
          )}
        </motion.div>
      )}

      {/* Top Bar Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/products"
            aria-label={STRINGS.common.back}
            className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-2xs"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              {product.product_name}
            </h1>
            <p className="text-xs font-semibold text-slate-400 mt-0.5">
              Code: <span className="font-mono text-slate-600">{product.unique_code}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="md"
            onClick={() => setStockModalOpen(true)}
            leftIcon={<Package className="w-4 h-4 text-emerald-600" />}
            className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
          >
            Adjust Stock ({product.quantity || 0})
          </Button>
          <Link href={`/dashboard/products/${product.id}/edit`}>
            <Button
              variant="outline"
              size="md"
              leftIcon={<Edit className="w-4 h-4" />}
            >
              {STRINGS.common.edit}
            </Button>
          </Link>
          <Button
            variant="destructive"
            size="md"
            onClick={() => setConfirmDeleteOpen(true)}
            leftIcon={<Trash2 className="w-4 h-4" />}
          >
            {STRINGS.common.delete}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column: Product Information */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <Card>
            <CardHeader>
              <CardTitle>Product Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="flex justify-between items-center py-1 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Price</span>
                <span className="text-lg font-bold text-[#E8436E]">₹{product.price}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Status</span>
                <Badge variant={product.is_active ? "success" : "warning"} withDot>
                  {product.is_active ? STRINGS.common.active : STRINGS.common.draft}
                </Badge>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Inventory</span>
                <div className="flex items-center gap-2">
                  <Badge variant={isOutOfStock ? "danger" : "neutral"}>
                    {isOutOfStock ? STRINGS.common.outOfStock : `${product.quantity} units`}
                  </Badge>
                  <button
                    type="button"
                    onClick={() => setStockModalOpen(true)}
                    className="text-xs font-bold text-[#E8436E] hover:underline cursor-pointer"
                  >
                    Adjust
                  </button>
                </div>
              </div>
              {product.has_variants && product.variants && product.variants.length > 0 && (
                <div className="py-2.5 border-b border-slate-100 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-medium">Size Breakdown</span>
                    <button
                      type="button"
                      onClick={() => setStockModalOpen(true)}
                      className="text-xs font-bold text-[#E8436E] hover:underline"
                    >
                      Update Sizes
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {product.variants.map((v) => (
                      <div
                        key={v.id}
                        className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-center"
                      >
                        <span className="text-xs font-bold text-slate-800 block">
                          Size {v.size}
                        </span>
                        <span
                          className={`text-xs font-extrabold ${
                            (v.quantity || 0) > 0 ? "text-emerald-600" : "text-rose-500"
                          }`}
                        >
                          {v.quantity || 0} in stock
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {product.accepts_custom_size && (
                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-500 font-medium">Custom Size Surcharge</span>
                  <span className="font-semibold text-slate-700">₹{product.custom_size_price}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {product.description && (
            <Card>
              <CardHeader>
                <CardTitle>Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                  {product.description}
                </p>
              </CardContent>
            </Card>
          )}
        </motion.div>

        {/* Right Column: Images & Quick Sell */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-6"
        >
          <Card>
            <CardHeader>
              <CardTitle>Gallery & Visuals</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {(product.images && product.images.length > 0
                  ? product.images
                  : product.image_url
                  ? [product.image_url]
                  : []
                ).map((img, i) => (
                  <div
                    key={i}
                    className="aspect-square rounded-xl bg-slate-50 overflow-hidden border border-slate-200/80 shadow-2xs relative"
                  >
                    <AuthenticatedImage
                      src={typeof img === "string" ? img : img.image_url}
                      productId={product.id}
                      imageIndex={i}
                      alt={product.product_name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
                {!product.image_url && (!product.images || product.images.length === 0) && (
                  <div className="col-span-2 flex flex-col items-center justify-center py-12 text-slate-300">
                    <Package className="w-12 h-12 stroke-1" />
                    <p className="text-xs font-medium text-slate-400 mt-2">No images uploaded</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className={action === "sell" ? "ring-2 ring-[#E8436E]/60 border-[#E8436E]/40 shadow-md" : ""}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-[#E8436E]" />
                {action === "sell" && orderNumber ? `Fulfill Order: ${orderNumber}` : "Sell Product Directly"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {completedSale ? (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-3 mb-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <div>
                      <h4 className="text-sm font-bold text-emerald-950">Sale Recorded Successfully!</h4>
                      <p className="text-xs text-emerald-700">Order linked to customer mobile app</p>
                    </div>
                  </div>

                  <div className="bg-white/90 p-3 rounded-xl border border-emerald-100 space-y-1.5 text-xs">
                    {completedSale.orderNumber && (
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-medium">Order Number:</span>
                        <span className="font-mono font-bold text-slate-800">{completedSale.orderNumber}</span>
                      </div>
                    )}
                    {completedSale.customerName && (
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-medium">Customer:</span>
                        <span className="font-bold text-slate-800">{completedSale.customerName} ({completedSale.phone})</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-medium">Quantity Sold:</span>
                      <span className="font-bold text-emerald-700">{completedSale.qty} set(s)</span>
                    </div>
                    <div className="flex justify-between border-t border-emerald-100 pt-1.5 font-bold">
                      <span className="text-slate-800">Total Amount:</span>
                      <span className="text-emerald-700 text-sm">₹{completedSale.total}</span>
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-500">
                      <span>Remaining Stock:</span>
                      <span className="font-semibold text-slate-700">{completedSale.remaining} units</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleOpenWhatsApp}
                      className="flex-1 py-2.5 px-3 bg-[#25D366] hover:bg-[#20ba59] text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors"
                    >
                      <Share2 className="w-4 h-4" />
                      Share WhatsApp Bill
                    </button>
                    <button
                      type="button"
                      onClick={() => setCompletedSale(null)}
                      className="py-2.5 px-4 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold text-xs transition-colors"
                    >
                      Sell More
                    </button>
                  </div>
                </div>
              ) : null}

              {isOutOfStock ? (
                <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-sm font-semibold">
                  Cannot sell — product is out of stock.
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Customer Account Identification */}
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-[#E8436E]" />
                        <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                          Customer Account (Mobile App Sync)
                        </span>
                      </div>
                      <span className="text-[10px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                        Required
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-500 leading-tight">
                      Only authenticated & authorized registered users can purchase products. Enter customer phone number to sync this purchase to their mobile app.
                    </p>

                    <div>
                      <div className="relative">
                        <input
                          type="tel"
                          value={customerPhone}
                          onChange={(e) => {
                            setCustomerPhone(e.target.value);
                            if (customerLookupStatus !== "idle") {
                              setCustomerLookupStatus("idle");
                              setVerifiedCustomer(null);
                            }
                            const digits = e.target.value.replace(/\D/g, "");
                            if (digits.length === 10) {
                              handleCheckCustomer(e.target.value);
                            }
                          }}
                          onBlur={() => handleCheckCustomer()}
                          placeholder="e.g. 9876543210"
                          className="w-full text-xs px-3 py-2 pr-8 bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#E8436E]"
                        />
                        <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                          {checkingCustomer ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#E8436E]" />
                          ) : customerLookupStatus === "found" ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          ) : customerLookupStatus === "not_found" ? (
                            <AlertCircle className="w-4 h-4 text-amber-500" />
                          ) : null}
                        </div>
                      </div>

                      {/* Customer Verification Status Banner */}
                      {customerLookupStatus === "found" && verifiedCustomer && (
                        <div className="mt-2 p-2 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1.5 text-emerald-800 font-medium">
                            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>Verified: <strong className="font-semibold">{verifiedCustomer.full_name || "Customer"}</strong> ({verifiedCustomer.phone || customerPhone})</span>
                          </div>
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded">
                            Authorized
                          </span>
                        </div>
                      )}

                      {customerLookupStatus === "not_found" && (
                        <div className="mt-2 p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-xs space-y-1.5">
                          <div className="flex items-center gap-1.5 text-amber-900 font-semibold">
                            <UserX className="w-4 h-4 text-amber-600 shrink-0" />
                            <span>No registered account found for this mobile number.</span>
                          </div>
                          <p className="text-[11px] text-amber-700">
                            Only authenticated and authorized registered customers can purchase products.
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              setNewCustPhone(customerPhone.trim());
                              setNewCustName(customerName.trim());
                              const digits = customerPhone.trim().replace(/\D/g, "").slice(-10);
                              setNewCustEmail(`customer_${digits}@sofiyabangles.com`);
                              setShowCreateAccountModal(true);
                            }}
                            className="w-full mt-1 py-1.5 px-3 bg-amber-600 hover:bg-amber-700 text-white rounded-md font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
                          >
                            <UserPlus className="w-3.5 h-3.5" />
                            Create & Authorize Customer Account Now
                          </button>
                        </div>
                      )}
                    </div>

                    <div>
                      <input
                        type="text"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="Customer Full Name"
                        className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#E8436E]"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setSellQty((q) => Math.max(1, q - 1))}
                      aria-label="Decrease quantity"
                      className="min-w-[44px] min-h-[44px] rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="text-lg font-bold w-10 text-center text-slate-900">
                      {sellQty}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSellQty((q) => Math.min(product.quantity, q + 1))}
                      aria-label="Increase quantity"
                      className="min-w-[44px] min-h-[44px] rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                    <Button
                      variant="primary"
                      size="md"
                      className="flex-1"
                      onClick={handleSell}
                      isLoading={selling}
                      leftIcon={<ShoppingCart className="w-4 h-4" />}
                    >
                      {action === "sell" && orderNumber ? "Fulfill & Sync Order" : "Sell Now"}
                    </Button>
                  </div>
                  <p className="text-xs text-slate-400 font-medium">
                    Decrements stock by {sellQty} (remaining after sale: {product.quantity - sellQty})
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Accessible Modal: Create Customer Account */}
      {showCreateAccountModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-customer-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
        >
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setShowCreateAccountModal(false)}
              className="absolute right-4 top-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
              aria-label="Close dialog"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 text-[#E8436E] flex items-center justify-center shrink-0">
                <UserPlus className="w-5 h-5" />
              </div>
              <div>
                <h3 id="create-customer-title" className="text-base font-bold text-slate-900">
                  Create Authorized Customer Account
                </h3>
                <p className="text-xs text-slate-500">
                  Required to complete purchase and link to the customer's mobile app.
                </p>
              </div>
            </div>

            <form onSubmit={handleCreateCustomerAccount} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Customer Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  placeholder="e.g. Fatima Khan"
                  className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E8436E] text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mobile Number (WhatsApp) *
                </label>
                <input
                  type="tel"
                  required
                  value={newCustPhone}
                  onChange={(e) => setNewCustPhone(e.target.value)}
                  placeholder="10-digit mobile number"
                  className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E8436E] text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={newCustEmail}
                  onChange={(e) => setNewCustEmail(e.target.value)}
                  placeholder="e.g. customer@example.com"
                  className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E8436E] text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Account Password (Optional - defaults to Sofiya@12345)
                </label>
                <input
                  type="text"
                  value={newCustPassword}
                  onChange={(e) => setNewCustPassword(e.target.value)}
                  placeholder="Sofiya@12345"
                  className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E8436E] text-slate-900 font-mono"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Customer can log in to the mobile app with this mobile number and password to track their orders.
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  className="flex-1"
                  onClick={() => setShowCreateAccountModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  className="flex-1"
                  isLoading={creatingAccount}
                  leftIcon={<UserCheck className="w-4 h-4" />}
                >
                  Create & Authorize
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Accessible ConfirmDialog for Product Deletion */}
      <ConfirmDialog
        isOpen={confirmDeleteOpen}
        onClose={() => setConfirmDeleteOpen(false)}
        onConfirm={handleDeleteConfirm}
        title={STRINGS.products.deleteConfirmTitle}
        message={STRINGS.products.deleteConfirmMessage(product.product_name)}
        confirmLabel={STRINGS.common.delete}
        cancelLabel={STRINGS.common.cancel}
        variant="destructive"
        isLoading={deleting}
      />

      {/* Stock Management Modal */}
      {stockModalOpen && product && (
        <StockModal
          product={product}
          isOpen={stockModalOpen}
          onClose={() => setStockModalOpen(false)}
          onStockUpdated={(updated) => {
            setProduct(updated);
          }}
        />
      )}
    </div>
  );
}
