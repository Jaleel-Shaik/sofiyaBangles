"use client";

import { useState, useEffect } from "react";
import {
  ShoppingBag,
  Search,
  Filter,
  Eye,
  CheckCircle2,
  Clock,
  Truck,
  RotateCcw,
  XCircle,
  PackageCheck,
  AlertCircle,
  Printer,
  ChevronRight,
  User,
  MapPin,
  CreditCard,
  Calendar,
  MessageCircle,
  Plus,
  Send,
  Package,
  Minus,
  Check,
  ExternalLink,
} from "lucide-react";
import { type AdminOrder, type Product } from "@/src/lib/api";
import toast from "react-hot-toast";
import { api } from "@/src/lib/api";

export default function OrdersManagementPage() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<AdminOrder | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // New WhatsApp Sale Modal State
  const [isSaleModalOpen, setIsSaleModalOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [sellQuantity, setSellQuantity] = useState(1);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [customerNotes, setCustomerNotes] = useState("");
  const [creatingSale, setCreatingSale] = useState(false);

  const fetchOrders = async (targetPage = page, targetSearch = search) => {
    setLoading(true);
    try {
      const res = await api.superAdmin.getOrders({
        page: targetPage,
        limit: 20,
        search: targetSearch || undefined,
      });
      setOrders(res.orders || []);
      setTotal(res.total || 0);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders(page, search);
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("action") === "new-sale") {
        openNewSaleModal();
      }
    }
  }, [page]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchOrders(1, search);
  };

  const handleResetSearch = () => {
    setSearch("");
    setPage(1);
    fetchOrders(1, "");
  };

  const openNewSaleModal = async () => {
    setIsSaleModalOpen(true);
    setLoadingProducts(true);
    try {
      const res = await api.admin.getAdminProducts(1, 100);
      setProducts(res.products || []);
      if (res.products && res.products.length > 0) {
        setSelectedProductId(res.products[0].id);
      }
    } catch (err) {
      toast.error("Failed to load products for sale");
    } finally {
      setLoadingProducts(false);
    }
  };

  const selectedProduct = products.find((p) => p.id === selectedProductId);

  const handleCreateWhatsAppSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) {
      toast.error("Please select a product");
      return;
    }
    if (sellQuantity < 1) {
      toast.error("Quantity must be at least 1");
      return;
    }
    if (sellQuantity > selectedProduct.quantity) {
      toast.error(`Only ${selectedProduct.quantity} units available in stock`);
      return;
    }
    if (!customerName.trim()) {
      toast.error("Customer name is required");
      return;
    }

    setCreatingSale(true);
    try {
      // 1. Create order in backend (which automatically decrements product stock in Firestore)
      const res = await api.superAdmin.createOrder({
        items: [
          {
            productId: selectedProduct.id,
            quantity: sellQuantity,
          },
        ],
        shippingAddressSnapshot: {
          full_name: customerName.trim(),
          phone: customerPhone.trim(),
          address_line1: customerAddress.trim() || "Local Customer",
          city: "Store Customer",
          notes: customerNotes.trim() || "Sold via WhatsApp order workflow",
          order_source: "whatsapp",
        },
      });

      const newOrder = res.data;
      const orderNumber = newOrder?.order_number || `#ORD-${Date.now().toString().slice(-6)}`;
      const totalAmount = selectedProduct.price * sellQuantity;

      // 2. Build pre-formatted WhatsApp bill
      const cleanPhone = customerPhone.replace(/[^0-9]/g, "");
      const formattedPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;

      const messageLines = [
        "✨ *SOFIYA BANGLES — ORDER RECEIPT* ✨",
        "━━━━━━━━━━━━━━━━━━━━",
        `*Order Number:* ${orderNumber}`,
        `*Customer Name:* ${customerName.trim()}`,
        `*Date:* ${new Date().toLocaleDateString("en-IN")}`,
        "",
        "*Items Ordered:*",
        `• ${selectedProduct.product_name}`,
        `  Qty: ${sellQuantity} set(s)  |  Rate: ₹${selectedProduct.price}  |  Subtotal: ₹${totalAmount}`,
        "",
        `*Grand Total:* ₹${totalAmount}`,
        "*Status:* Order Confirmed (Stock Decreased)",
        "━━━━━━━━━━━━━━━━━━━━",
        customerAddress.trim() ? `*Delivery Address:* ${customerAddress.trim()}` : "",
        "",
        "💖 *Thank you for ordering with Sofiya Bangles!*",
        "We are preparing your handcrafted bangles for delivery.",
      ].filter(Boolean);

      const encodedText = encodeURIComponent(messageLines.join("\n"));
      const whatsappUrl = formattedPhone
        ? `https://wa.me/${formattedPhone}?text=${encodedText}`
        : `https://wa.me/?text=${encodedText}`;

      // Open WhatsApp Web or App
      window.open(whatsappUrl, "_blank");

      toast.success(
        `Sale recorded! Product stock decreased by ${sellQuantity}. Opening WhatsApp...`
      );

      // Reset modal and reload orders
      setIsSaleModalOpen(false);
      setSellQuantity(1);
      setCustomerName("");
      setCustomerPhone("");
      setCustomerAddress("");
      setCustomerNotes("");
      await fetchOrders();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to record WhatsApp sale");
    } finally {
      setCreatingSale(false);
    }
  };

  const handleShareOrderOnWhatsApp = (order: AdminOrder) => {
    const rawPhone = order.customer_phone || order.shipping_address_snapshot?.phone || "";
    let cleanPhone = rawPhone.replace(/[^0-9]/g, "");
    if (cleanPhone.length === 10) cleanPhone = `91${cleanPhone}`;

    const itemsSummary = (order.items || [])
      .map(
        (i) =>
          `• ${i.product_name || i.productNameSnapshot || "Bangles Set"}\n  Qty: ${
            i.quantity
          }  |  Rate: ₹${i.itemPrice || i.unit_price || 0}  |  Subtotal: ₹${
            (i.itemPrice || i.unit_price || 0) * i.quantity
          }`
      )
      .join("\n");

    const messageLines = [
      "✨ *SOFIYA BANGLES — ORDER DETAILS* ✨",
      "━━━━━━━━━━━━━━━━━━━━",
      `*Order Number:* ${order.order_number}`,
      `*Customer:* ${order.customer_name || "Valued Customer"}`,
      `*Status:* ${(order.status || "Pending").toUpperCase()}`,
      `*Date:* ${new Date(order.created_at).toLocaleDateString("en-IN")}`,
      "",
      "*Items Ordered:*",
      itemsSummary || "• Handcrafted Bangles Collection",
      "",
      `*Grand Total:* ₹${order.total_amount}`,
      "━━━━━━━━━━━━━━━━━━━━",
      order.shipping_address_snapshot?.address_line1
        ? `*Delivery To:* ${order.shipping_address_snapshot.address_line1}`
        : "",
      "",
      "Thank you for shopping with Sofiya Bangles! 💫",
    ].filter(Boolean);

    const encoded = encodeURIComponent(messageLines.join("\n"));
    const url = cleanPhone ? `https://wa.me/${cleanPhone}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
    window.open(url, "_blank");
  };

  const handleUpdateStatus = async (orderId: string, newStatus: string, notes?: string) => {
    setActionLoading(true);
    try {
      await api.superAdmin.updateOrderStatus(orderId, newStatus, notes);
      toast.success(`Order status changed to ${newStatus}`);
      await fetchOrders();
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder((prev) => (prev ? { ...prev, status: newStatus } : null));
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Status update failed");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCompleteOrder = async (orderId: string) => {
    if (
      !confirm(
        "Mark this order as COMPLETED? This allocates the 70/30 commission into the revenue ledger."
      )
    ) {
      return;
    }
    setActionLoading(true);
    try {
      await api.superAdmin.completeOrder(orderId);
      toast.success("Order completed and 70/30 commission allocated!");
      await fetchOrders();
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder((prev) => (prev ? { ...prev, status: "completed" } : null));
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to complete order");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRefundOrder = async (orderId: string) => {
    const reason = prompt("Please enter the cancellation/refund reason:");
    if (!reason) return;
    setActionLoading(true);
    try {
      await api.superAdmin.refundOrder(orderId, reason);
      toast.success("Order refunded and ledger reversed.");
      await fetchOrders();
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder((prev) => (prev ? { ...prev, status: "refunded" } : null));
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to refund order");
    } finally {
      setActionLoading(false);
    }
  };

  const handlePrintInvoice = (order: AdminOrder) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const itemsHtml = (order.items || [])
      .map(
        (i) => `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">${
            i.product_name || i.productNameSnapshot || "Bangles Set"
          }</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${
            i.quantity
          }</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">₹${
            i.itemPrice || i.unit_price || 0
          }</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right; font-weight: bold;">₹${
            (i.itemPrice || i.unit_price || 0) * i.quantity
          }</td>
        </tr>
      `
      )
      .join("");

    printWindow.document.write(`
      <html>
        <head>
          <title>Invoice - ${order.order_number}</title>
          <style>
            body { font-family: sans-serif; padding: 30px; color: #333; max-width: 700px; margin: 0 auto; }
            .header { text-align: center; border-bottom: 2px solid #E8436E; padding-bottom: 15px; margin-bottom: 20px; }
            .meta { display: flex; justify-content: space-between; margin-bottom: 20px; font-size: 13px; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 13px; }
            th { background: #fdf2f4; color: #E8436E; padding: 8px; text-align: left; }
            .total { text-align: right; margin-top: 20px; font-size: 16px; font-weight: bold; color: #E8436E; }
            .badge { display: inline-block; padding: 4px 8px; border-radius: 4px; background: #e6f4ea; color: #137333; font-size: 11px; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2 style="margin: 0; color: #E8436E;">SOFIYA BANGLES</h2>
            <p style="margin: 4px 0 0; font-size: 12px; color: #666;">Customer Order & Delivery Receipt</p>
          </div>
          <div class="meta">
            <div>
              <strong>Order Number:</strong> ${order.order_number}<br>
              <strong>Date:</strong> ${new Date(order.created_at).toLocaleString()}<br>
              <strong>Status:</strong> <span class="badge">${order.status.toUpperCase()}</span>
            </div>
            <div style="text-align: right;">
              <strong>Customer:</strong> ${order.customer_name || "Customer"}<br>
              <strong>Phone:</strong> ${order.customer_phone || "—"}<br>
              <strong>Address:</strong> ${(order.shipping_address_snapshot as any)?.address_line1 || "Store Pickup"}
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Item Description</th>
                <th style="text-align: center;">Qty</th>
                <th style="text-align: right;">Rate</th>
                <th style="text-align: right;">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>
          <div class="total">
            Total Paid: ₹${order.total_amount}
          </div>
          <p style="text-align: center; margin-top: 40px; font-size: 11px; color: #999;">
            Handcrafted with love by Sofiya Bangles. Thank you for your business!
          </p>
          <script>window.print();</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6 w-full">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <ShoppingBag className="w-6 h-6 text-[#E8436E]" /> Orders & WhatsApp Fulfillment
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Fulfill customer orders, decrease product inventory stock counts upon sale, and instantly share bills on WhatsApp.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Record WhatsApp Sale Button */}
          <button
            onClick={openNewSaleModal}
            className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition-all hover:scale-[1.02]"
          >
            <MessageCircle className="w-4 h-4 fill-white" /> + Record WhatsApp Sale
          </button>

          <span className="text-xs font-semibold px-3 py-2 rounded-xl bg-slate-100 text-slate-700">
            Total Orders: {total}
          </span>
        </div>
      </div>

      {/* Clean Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search by order number (#ORD-...), customer name, or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#E8436E]"
            />
          </div>
          <button
            type="submit"
            className="px-5 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors"
          >
            Search
          </button>
          {search && (
            <button
              type="button"
              onClick={handleResetSearch}
              className="px-3 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors"
            >
              Reset
            </button>
          )}
        </form>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-16 text-center text-slate-400 text-xs">
            Loading order fulfillment records...
          </div>
        ) : orders.length === 0 ? (
          <div className="p-16 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-rose-50 text-[#E8436E] flex items-center justify-center mx-auto">
              <ShoppingBag className="w-7 h-7" />
            </div>
            <div className="max-w-md mx-auto space-y-1">
              <h3 className="text-base font-bold text-slate-900">
                {search ? "No Orders Matching Search" : "No Orders Recorded Yet"}
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                When a customer orders via WhatsApp or direct sale, record the sale here. It will automatically decrease the product stock count and send the bill to WhatsApp.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={openNewSaleModal}
                className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition-all"
              >
                <MessageCircle className="w-4 h-4 fill-white" /> + Record WhatsApp Sale
              </button>
              {search && (
                <button
                  onClick={handleResetSearch}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Clear Search
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-bold">
                <tr>
                  <th className="p-4">Order Details</th>
                  <th className="p-4">Customer & Contact</th>
                  <th className="p-4">Items Ordered</th>
                  <th className="p-4">Amount</th>
                  <th className="p-4">Stock Status</th>
                  <th className="p-4">Order Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {orders.map((order) => {
                  const itemsCount = (order.items || []).reduce(
                    (acc, i) => acc + (i.quantity || 1),
                    0
                  );

                  return (
                    <tr key={order.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Order No & Date */}
                      <td className="p-4 whitespace-nowrap">
                        <p className="font-bold text-slate-900 font-mono text-sm">
                          {order.order_number}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {new Date(order.created_at).toLocaleString()}
                        </p>
                      </td>

                      {/* Customer Info */}
                      <td className="p-4">
                        <p className="font-bold text-slate-900 leading-tight">
                          {order.customer_name || "Customer"}
                        </p>
                        {order.customer_phone ? (
                          <a
                            href={`https://wa.me/${order.customer_phone.replace(/[^0-9]/g, "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-semibold hover:underline mt-0.5"
                          >
                            <MessageCircle className="w-3 h-3 fill-emerald-600" />
                            {order.customer_phone}
                          </a>
                        ) : (
                          <span className="text-[11px] text-slate-400">Direct Customer</span>
                        )}
                      </td>

                      {/* Line Items Summary */}
                      <td className="p-4 max-w-xs">
                        <div className="space-y-1">
                          {(order.items || []).slice(0, 2).map((item, idx) => (
                            <p key={idx} className="text-xs text-slate-800 font-medium truncate">
                              • {item.product_name || item.productNameSnapshot || "Bangles Set"}{" "}
                              <span className="text-slate-400 font-normal">
                                (Qty: {item.quantity})
                              </span>
                            </p>
                          ))}
                          {(order.items || []).length > 2 && (
                            <span className="text-[10px] text-slate-400 font-semibold">
                              +{(order.items || []).length - 2} more item(s)
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Total Amount */}
                      <td className="p-4 whitespace-nowrap">
                        <p className="font-black text-slate-900 text-sm">₹{order.total_amount}</p>
                        <p className="text-[10px] text-emerald-700 font-semibold uppercase">
                          {order.payment_status || "Paid"}
                        </p>
                      </td>

                      {/* Stock Decrement Status */}
                      <td className="p-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <Check className="w-3 h-3 text-emerald-600" /> Stock -{itemsCount}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="p-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                            order.status === "completed"
                              ? "bg-emerald-100 text-emerald-800"
                              : order.status === "delivered"
                              ? "bg-blue-100 text-blue-800"
                              : order.status === "shipped"
                              ? "bg-purple-100 text-purple-800"
                              : order.status === "processing"
                              ? "bg-amber-100 text-amber-800"
                              : order.status === "refunded"
                              ? "bg-rose-100 text-rose-800"
                              : "bg-slate-100 text-slate-800"
                          }`}
                        >
                          {order.status}
                        </span>
                      </td>

                      {/* Action Buttons */}
                      <td className="p-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          {/* Share on WhatsApp Button */}
                          <button
                            onClick={() => handleShareOrderOnWhatsApp(order)}
                            title="Share Order Bill on WhatsApp"
                            className="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition-colors flex items-center gap-1 text-[11px] font-bold"
                          >
                            <MessageCircle className="w-3.5 h-3.5 fill-emerald-600 text-white" />
                            <span className="hidden sm:inline">WhatsApp</span>
                          </button>

                          {/* Print Invoice Button */}
                          <button
                            onClick={() => handlePrintInvoice(order)}
                            title="Print Invoice"
                            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>

                          {/* View Drawer Button */}
                          <button
                            onClick={() => setSelectedOrder(order)}
                            className="p-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition-colors text-[11px] font-bold flex items-center gap-1"
                          >
                            <Eye className="w-3.5 h-3.5" /> View
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {total > 20 && (
          <div className="p-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
            <span>
              Page {page} of {Math.ceil(total / 20) || 1}
            </span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 font-semibold"
              >
                Previous
              </button>
              <button
                disabled={page * 20 >= total}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 font-semibold"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* RECORD WHATSAPP SALE MODAL */}
      {isSaleModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <MessageCircle className="w-4 h-4 fill-emerald-600" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    Record New WhatsApp Sale
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Decreases product stock count and sends WhatsApp bill
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsSaleModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {loadingProducts ? (
              <div className="py-12 text-center text-xs text-slate-400">Loading catalog...</div>
            ) : (
              <form onSubmit={handleCreateWhatsAppSale} className="space-y-4">
                {/* 1. Select Product */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    Select Bangles Product <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-600 bg-white"
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id} disabled={p.quantity <= 0}>
                        {p.product_name} — ₹{p.price} ({p.quantity} available in stock)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Stock info badge */}
                {selectedProduct && (
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-slate-800">Current Stock: </span>
                      <span className="font-bold text-emerald-700">
                        {selectedProduct.quantity} units
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500">After Sale: </span>
                      <span className="font-bold text-purple-700">
                        {Math.max(0, selectedProduct.quantity - sellQuantity)} units
                      </span>
                    </div>
                  </div>
                )}

                {/* 2. Quantity Selector */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    Quantity to Sell <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setSellQuantity((q) => Math.max(1, q - 1))}
                      className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 font-bold"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <input
                      type="number"
                      min="1"
                      max={selectedProduct?.quantity || 99}
                      value={sellQuantity}
                      onChange={(e) =>
                        setSellQuantity(
                          Math.max(
                            1,
                            Math.min(selectedProduct?.quantity || 99, Number(e.target.value) || 1)
                          )
                        )
                      }
                      className="w-20 p-2 rounded-xl border border-slate-200 text-center font-bold text-sm text-slate-900 focus:outline-none focus:border-emerald-600"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setSellQuantity((q) =>
                          Math.min(selectedProduct?.quantity || 99, q + 1)
                        )
                      }
                      className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 font-bold"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>

                    {selectedProduct && (
                      <span className="text-xs font-black text-slate-900 ml-auto">
                        Total: ₹{selectedProduct.price * sellQuantity}
                      </span>
                    )}
                  </div>
                </div>

                {/* 3. Customer Information */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">
                      Customer Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Priya Sharma"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-emerald-600"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">
                      WhatsApp Number <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="tel"
                      placeholder="e.g. 9876543210"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-emerald-600"
                      required
                    />
                  </div>
                </div>

                {/* 4. Address */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Delivery Address / City</label>
                  <input
                    type="text"
                    placeholder="e.g. Banjara Hills, Hyderabad, Telangana"
                    value={customerAddress}
                    onChange={(e) => setCustomerAddress(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-emerald-600"
                  />
                </div>

                {/* Submit Action */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsSaleModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creatingSale}
                    className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 disabled:opacity-50 transition-all"
                  >
                    <MessageCircle className="w-4 h-4 fill-white" />
                    {creatingSale ? "Recording Sale..." : "Confirm & Send on WhatsApp"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ORDER DETAILS DRAWER */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex justify-end">
          <div className="bg-white w-full max-w-lg h-full p-6 shadow-2xl overflow-y-auto space-y-6 flex flex-col justify-between">
            <div className="space-y-6">
              {/* Drawer Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h3 className="font-bold text-slate-900 text-lg">Order Details</h3>
                  <p className="font-mono text-xs text-slate-400">{selectedOrder.order_number}</p>
                </div>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 font-bold"
                >
                  ✕
                </button>
              </div>

              {/* WhatsApp Quick Action Banner */}
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-emerald-900">WhatsApp Order Workflow</p>
                  <p className="text-[11px] text-emerald-700">
                    Send order status or bill directly to customer
                  </p>
                </div>
                <button
                  onClick={() => handleShareOrderOnWhatsApp(selectedOrder)}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm"
                >
                  <MessageCircle className="w-3.5 h-3.5 fill-white" /> Share on WhatsApp
                </button>
              </div>

              {/* Status & Timing */}
              <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-4 rounded-xl">
                <div>
                  <span className="text-slate-400 font-medium">Status</span>
                  <p className="font-bold uppercase text-slate-900 mt-0.5">{selectedOrder.status}</p>
                </div>
                <div>
                  <span className="text-slate-400 font-medium">Placed On</span>
                  <p className="font-bold text-slate-900 mt-0.5">
                    {new Date(selectedOrder.created_at).toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Customer Info */}
              <div className="space-y-2 border border-slate-100 p-4 rounded-xl">
                <p className="text-xs font-bold text-slate-900 uppercase">Customer Information</p>
                <div className="text-xs space-y-1 text-slate-600">
                  <p>
                    <span className="font-semibold text-slate-900">Name:</span>{" "}
                    {selectedOrder.customer_name || "Customer"}
                  </p>
                  <p>
                    <span className="font-semibold text-slate-900">Phone:</span>{" "}
                    {selectedOrder.customer_phone || "Not provided"}
                  </p>
                  <p>
                    <span className="font-semibold text-slate-900">Address:</span>{" "}
                    {(selectedOrder.shipping_address_snapshot as any)?.address_line1 || "Store Pickup"}
                  </p>
                </div>
              </div>

              {/* Line Items */}
              <div className="space-y-3">
                <p className="text-xs font-bold text-slate-900 uppercase">
                  Bangles Line Items ({(selectedOrder.items || []).length})
                </p>
                <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden">
                  {(selectedOrder.items || []).map((item, i) => (
                    <div key={i} className="p-3 flex items-center justify-between text-xs">
                      <div>
                        <p className="font-bold text-slate-900">
                          {item.product_name || item.productNameSnapshot || "Bangles Set"}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          Qty: {item.quantity} × ₹{item.itemPrice || item.unit_price || 0}
                        </p>
                      </div>
                      <span className="font-bold text-slate-900">
                        ₹{(item.itemPrice || item.unit_price || 0) * item.quantity}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Financial Totals */}
              <div className="flex justify-between items-center bg-slate-900 text-white p-4 rounded-xl">
                <span className="text-xs font-semibold">Total Order Amount</span>
                <span className="text-lg font-black">₹{selectedOrder.total_amount}</span>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pt-4 border-t border-slate-100 space-y-2">
              <div className="grid grid-cols-3 gap-2">
                <button
                  disabled={actionLoading || selectedOrder.status === "processing"}
                  onClick={() => handleUpdateStatus(selectedOrder.id, "processing")}
                  className="py-2 rounded-xl text-xs font-bold bg-amber-50 text-amber-800 hover:bg-amber-100 transition-colors disabled:opacity-50"
                >
                  Mark Processing
                </button>
                <button
                  disabled={actionLoading || selectedOrder.status === "shipped"}
                  onClick={() => handleUpdateStatus(selectedOrder.id, "shipped")}
                  className="py-2 rounded-xl text-xs font-bold bg-purple-50 text-purple-800 hover:bg-purple-100 transition-colors disabled:opacity-50"
                >
                  Mark Shipped
                </button>
                <button
                  disabled={actionLoading || selectedOrder.status === "delivered"}
                  onClick={() => handleUpdateStatus(selectedOrder.id, "delivered")}
                  className="py-2 rounded-xl text-xs font-bold bg-blue-50 text-blue-800 hover:bg-blue-100 transition-colors disabled:opacity-50"
                >
                  Mark Delivered
                </button>
              </div>

              <div className="flex gap-2">
                <button
                  disabled={actionLoading || selectedOrder.status === "completed"}
                  onClick={() => handleCompleteOrder(selectedOrder.id)}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors disabled:opacity-50 shadow-sm"
                >
                  Complete Order (70/30 Split)
                </button>
                <button
                  disabled={actionLoading || selectedOrder.status === "refunded"}
                  onClick={() => handleRefundOrder(selectedOrder.id)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors disabled:opacity-50"
                >
                  Cancel / Refund
                </button>
              </div>

              <button
                onClick={() => handlePrintInvoice(selectedOrder)}
                className="w-full py-2.5 rounded-xl text-xs font-bold border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors flex items-center justify-center gap-1.5"
              >
                <Printer className="w-4 h-4" /> Print Customer Invoice
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
