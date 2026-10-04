"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  CheckCheck,
  Trash2,
  RefreshCw,
  ShoppingBag,
  Package,
  AlertTriangle,
  Star,
  Zap,
  ChevronRight,
  X,
  Inbox,
  Check,
  Tag,
  DollarSign,
  ArrowUpRight,
  Crown,
  ShieldAlert,
  ShieldCheck,
  Shield,
  Layers,
} from "lucide-react";
import toast from "react-hot-toast";
import { api, type AdminNotification } from "@/src/lib/api";
import { AuthenticatedImage } from "@/src/components/ui";

type NotificationCategoryTab = "all" | "unread" | "orders" | "stock" | "reviews" | "security";

export function getNotificationCategory(n: AdminNotification): "orders" | "stock" | "reviews" | "security" | "system" {
  const type = (n.type || "").toUpperCase();
  const title = (n.title || "").toLowerCase();
  const body = (n.body || n.message || "").toLowerCase();

  // Security & Audit (Super-Admin exclusive category)
  if (
    type === "AUDIT_ALERT" ||
    type === "SECURITY_ALERT" ||
    type === "SYSTEM_SECURITY" ||
    type === "ROLE_CHANGE" ||
    type === "2FA_RESET" ||
    title.includes("security") ||
    title.includes("audit") ||
    body.includes("audit log") ||
    body.includes("2fa") ||
    body.includes("permission")
  ) {
    return "security";
  }

  // Orders & Sales
  if (
    type === "NEW_SALE" ||
    type === "ORDER" ||
    type === "ORDER_STATUS" ||
    type === "ORDER_STATUS_UPDATE" ||
    type === "REFUND" ||
    type === "PAYMENT" ||
    title.includes("sale") ||
    title.includes("order") ||
    title.includes("refund") ||
    title.includes("purchased") ||
    body.includes("order ord-") ||
    /ORD-[\w\d-]+/i.test(title) ||
    /ORD-[\w\d-]+/i.test(body)
  ) {
    return "orders";
  }

  // Stock & Inventory & New Arrivals
  if (
    type === "LOW_STOCK" ||
    type === "OUT_OF_STOCK" ||
    type === "RESTOCK" ||
    type === "STOCK_UPDATE" ||
    type === "PRODUCT_RESTOCKED" ||
    type === "NEW_ARRIVAL" ||
    title.includes("stock") ||
    title.includes("inventory") ||
    title.includes("quantity") ||
    title.includes("arrival") ||
    body.includes("arrival")
  ) {
    return "stock";
  }

  // Reviews & Feedback
  if (
    type === "REVIEW" ||
    type === "RATING" ||
    type === "PRODUCT_REVIEW" ||
    type === "FEEDBACK" ||
    title.includes("review") ||
    title.includes("rated") ||
    title.includes("feedback") ||
    title.includes("defect")
  ) {
    return "reviews";
  }

  return "system";
}

export function formatRelativeTime(dateString?: string): string {
  if (!dateString) return "";
  const now = Date.now();
  const time = new Date(dateString).getTime();
  if (isNaN(time)) return "";
  const diffSec = Math.floor((now - time) / 1000);
  if (diffSec < 45) return "Just now";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  if (diffSec < 172800) return "Yesterday";
  return new Date(dateString).toLocaleDateString([], { month: "short", day: "numeric" });
}

interface NotificationCenterProps {
  userRole?: string;
}

export function NotificationCenter({ userRole }: NotificationCenterProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<NotificationCategoryTab>("all");
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const [clearing, setClearing] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const knownNotifIdsRef = useRef<Set<string>>(new Set());
  const initialLoadDoneRef = useRef(false);

  // Fetch notifications
  const fetchNotifications = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const items = await api.superAdmin.getNotifications();
      const list = Array.isArray(items) ? items : [];
      setNotifications(list);

      // Detect brand new notifications for live toast alert
      if (initialLoadDoneRef.current && list.length > 0) {
        const brandNew = list.filter((n) => !n.is_read && !knownNotifIdsRef.current.has(n.id));
        if (brandNew.length > 0) {
          const newest = brandNew[0];
          // Show live interactive toast alert
          toast.custom(
            (t) => (
              <div
                className={`${
                  t.visible ? "animate-enter" : "animate-leave"
                } max-w-sm w-full bg-white shadow-2xl rounded-2xl pointer-events-auto flex items-center p-3.5 border border-rose-100/90 ring-1 ring-black/5 cursor-pointer hover:bg-rose-50/40 transition-all`}
                onClick={() => {
                  toast.dismiss(t.id);
                  handleNotificationClick(newest);
                }}
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#E8436E] to-[#CC3366] flex items-center justify-center text-white shrink-0 overflow-hidden shadow-sm">
                  {newest.image_url ? (
                    <img src={newest.image_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Bell className="w-5 h-5 text-white" />
                  )}
                </div>
                <div className="ml-3 flex-1 overflow-hidden">
                  <p className="text-xs font-bold text-slate-900 truncate">{newest.title}</p>
                  <p className="text-[11px] text-slate-500 truncate mt-0.5">{newest.body || newest.message}</p>
                </div>
                <div className="ml-3 flex items-center gap-1 shrink-0">
                  <span className="text-[10px] font-bold text-[#E8436E] bg-rose-50 px-2 py-1 rounded-md">
                    Open &rarr;
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toast.dismiss(t.id);
                    }}
                    className="text-slate-400 hover:text-slate-600 p-1"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ),
            { duration: 5000, position: "top-right" }
          );
        }
      }

      // Update known IDs
      list.forEach((n) => knownNotifIdsRef.current.add(n.id));
      initialLoadDoneRef.current = true;
    } catch (err) {
      console.error("Failed to load notifications:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Periodic polling every 15s
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(() => {
      fetchNotifications();
    }, 15000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // ESC to close
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Category counts
  const unreadCount = useMemo(() => notifications.filter((n) => !n.is_read).length, [notifications]);

  // Tab counts with role-aware metrics
  const tabCounts = useMemo(() => {
    return {
      all: notifications.length,
      unread: notifications.filter((n) => !n.is_read).length,
      orders: notifications.filter((n) => getNotificationCategory(n) === "orders").length,
      stock: notifications.filter((n) => getNotificationCategory(n) === "stock").length,
      reviews: notifications.filter((n) => getNotificationCategory(n) === "reviews").length,
      security: notifications.filter((n) => getNotificationCategory(n) === "security").length,
    };
  }, [notifications]);

  // Filtered notifications
  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => {
      const cat = getNotificationCategory(n);
      if (activeTab === "unread") return !n.is_read;
      if (activeTab === "orders") return cat === "orders";
      if (activeTab === "stock") return cat === "stock";
      if (activeTab === "reviews") return cat === "reviews";
      if (activeTab === "security") return cat === "security";
      return true;
    });
  }, [notifications, activeTab]);

  // Mark single as read
  const handleMarkAsRead = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
      await api.superAdmin.markNotificationRead(id);
    } catch (err) {
      console.error("Failed to mark notification read:", err);
    }
  };

  // Delete single notification
  const handleDeleteNotification = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      await api.superAdmin.deleteNotification(id);
      toast.success("Notification removed", { duration: 1500 });
    } catch (err) {
      console.error("Failed to delete notification:", err);
    }
  };

  // Mark all as read
  const handleMarkAllAsRead = async () => {
    if (unreadCount === 0) return;
    setMarkingAll(true);
    try {
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      await api.superAdmin.markAllNotificationsRead();
      toast.success("All notifications marked as read");
    } catch (err) {
      console.error("Failed to mark all as read:", err);
      toast.error("Failed to mark all as read");
    } finally {
      setMarkingAll(false);
    }
  };

  // Clear all notifications
  const handleClearAll = async () => {
    if (notifications.length === 0) return;
    if (!confirm("Are you sure you want to clear all notifications?")) return;
    setClearing(true);
    try {
      setNotifications([]);
      await api.superAdmin.clearAllNotifications();
      toast.success("All notifications cleared");
    } catch (err) {
      console.error("Failed to clear notifications:", err);
      toast.error("Failed to clear notifications");
    } finally {
      setClearing(false);
    }
  };

  // Click & Navigate with deep-link
  const handleNotificationClick = async (n: AdminNotification) => {
    if (!n.is_read) {
      handleMarkAsRead(n.id);
    }
    setIsOpen(false);

    const cat = getNotificationCategory(n);
    const titleText = n.title || "";
    const bodyText = n.body || n.message || "";
    const extractedOrderNo = (
      n.order_number ||
      titleText.match(/ORD-[\w\d-]+/i)?.[0] ||
      bodyText.match(/ORD-[\w\d-]+/i)?.[0] ||
      ""
    ).replace(/^#/, "");

    const extractedProductTitle = titleText
      .replace(/^New Arrival:\s*/i, "")
      .replace(/✨/g, "")
      .trim();

    if (cat === "security") {
      router.push("/dashboard/super-admin/audit-logs");
      return;
    }

    if (cat === "orders" || extractedOrderNo) {
      const searchTarget = extractedOrderNo || n.order_id || "";
      const idParam = n.order_id ? `&id=${encodeURIComponent(n.order_id)}` : "";

      // Notify orders page if already open
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("open-order-notification", {
            detail: { orderNumber: searchTarget, orderId: n.order_id },
          })
        );
      }
      router.push(`/dashboard/orders${searchTarget ? `?search=${encodeURIComponent(searchTarget)}${idParam}` : ""}`);
      return;
    }

    if (cat === "stock" || n.product_id) {
      if (n.product_id) {
        router.push(`/dashboard/products/${encodeURIComponent(n.product_id)}`);
      } else {
        const searchTarget = n.unique_code || extractedProductTitle || "";
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("open-product-notification", {
              detail: { searchTarget, code: n.unique_code, productId: n.product_id },
            })
          );
        }
        router.push(`/dashboard/products${searchTarget ? `?search=${encodeURIComponent(searchTarget)}` : ""}`);
      }
      return;
    }

    if (cat === "reviews") {
      const searchTarget = n.unique_code || n.product_id || extractedOrderNo || "";
      const productParam = n.product_id ? `&productId=${encodeURIComponent(n.product_id)}` : "";
      router.push(`/dashboard/reviews${searchTarget ? `?search=${encodeURIComponent(searchTarget)}${productParam}` : ""}`);
      return;
    }

    if (n.product_id) {
      router.push(`/dashboard/products/${encodeURIComponent(n.product_id)}`);
    } else if (extractedOrderNo || n.order_id) {
      router.push(`/dashboard/orders?search=${encodeURIComponent(extractedOrderNo || n.order_id || "")}`);
    } else {
      router.push("/dashboard/orders");
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      {/* Bell Trigger Button */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="Admin Notifications"
        title="Admin Notifications Center"
        className={`min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl transition-all relative ${
          isOpen
            ? "bg-rose-50 text-[#E8436E] border border-rose-200"
            : "bg-[#F5F5F5] hover:bg-[#E5E5E5] text-[#525252]"
        }`}
      >
        <Bell className="w-5 h-5 transition-transform group-hover:scale-110" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 bg-[#E8436E] text-white text-[10px] font-black rounded-full flex items-center justify-center shadow-md animate-pulse">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Floating Notification Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.96 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
            className="absolute right-0 mt-2.5 w-[360px] sm:w-[480px] bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200/90 z-50 overflow-hidden flex flex-col max-h-[85vh]"
          >
            {/* Header */}
            <div className="p-4 pb-3 border-b border-slate-100 flex items-center justify-between gap-2 bg-gradient-to-b from-white to-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shadow-2xs ${
                    userRole === "super_admin"
                      ? "bg-amber-50 border border-amber-200 text-amber-600"
                      : "bg-rose-50 border border-rose-100 text-[#E8436E]"
                  }`}
                >
                  {userRole === "super_admin" ? (
                    <Crown className="w-4 h-4" />
                  ) : (
                    <Bell className="w-4 h-4" />
                  )}
                </div>
                <div>
                  <h3 className="font-black text-sm text-slate-900 tracking-tight flex items-center gap-2">
                    {userRole === "super_admin" ? "Super Admin Command" : "Store Notifications"}
                    {unreadCount > 0 ? (
                      <span className="text-[10px] bg-rose-500 text-white font-black px-2 py-0.5 rounded-full shadow-2xs">
                        {unreadCount} new
                      </span>
                    ) : (
                      <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                        All caught up
                      </span>
                    )}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-medium">
                    {userRole === "super_admin"
                      ? "Executive oversight: Security, audit logs, sales & inventory"
                      : "Live store orders, stock warnings & customer feedback"}
                  </p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => fetchNotifications(true)}
                  disabled={refreshing}
                  title="Refresh Notifications"
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-[#E8436E]" : ""}`} />
                </button>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={handleMarkAllAsRead}
                    disabled={markingAll}
                    title="Mark all as read"
                    className="flex items-center gap-1 px-2 py-1 text-[11px] font-bold text-[#E8436E] hover:bg-rose-50 rounded-lg transition-colors"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Mark all read</span>
                  </button>
                )}
                {notifications.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearAll}
                    disabled={clearing}
                    title="Clear all notifications"
                    className="flex items-center gap-1 px-2 py-1 text-[11px] font-bold text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Clear all</span>
                  </button>
                )}
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="px-3 py-2 border-b border-slate-100 flex items-center gap-1.5 bg-white overflow-x-auto no-scrollbar scroll-smooth">
              {(
                [
                  { id: "all" as const, label: "All", count: tabCounts.all },
                  { id: "unread" as const, label: "Unread", count: tabCounts.unread },
                  { id: "orders" as const, label: "Orders & Sales", count: tabCounts.orders },
                  { id: "stock" as const, label: "Stock Alerts", count: tabCounts.stock },
                  { id: "reviews" as const, label: "Reviews", count: tabCounts.reviews },
                  ...(userRole === "super_admin"
                    ? [{ id: "security" as const, label: "Security & Audit", count: tabCounts.security }]
                    : []),
                ]
              ).map((tab) => {
                const isActive = activeTab === tab.id;
                const isSecurity = tab.id === "security";
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                      isActive
                        ? isSecurity
                          ? "bg-red-600 text-white shadow-xs"
                          : "bg-[#E8436E] text-white shadow-xs"
                        : isSecurity
                        ? "text-red-700 bg-red-50/80 hover:bg-red-100/80"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                    }`}
                  >
                    {isSecurity && <ShieldAlert className="w-3 h-3 text-red-300" />}
                    <span>{tab.label}</span>
                    {tab.count > 0 && (
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                          isActive
                            ? "bg-white/20 text-white"
                            : isSecurity
                            ? "bg-red-200/80 text-red-900"
                            : tab.id === "unread"
                            ? "bg-rose-100 text-[#E8436E]"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {tab.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Notification List Container */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 max-h-[440px]">
              {filteredNotifications.length === 0 ? (
                <div className="py-12 px-6 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                    <Inbox className="w-6 h-6 stroke-[1.5]" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-700">No notifications found</h4>
                  <p className="text-xs text-slate-400 mt-1 max-w-[280px] mx-auto">
                    {activeTab === "unread"
                      ? "Great job! All your notifications have been reviewed."
                      : activeTab === "security"
                      ? "No security incidents, role modifications, or audit alerts recorded."
                      : activeTab === "orders"
                      ? "No new online orders or walk-in sales in this view."
                      : activeTab === "stock"
                      ? "All inventory levels are healthy with no stock alerts."
                      : activeTab === "reviews"
                      ? "No new customer reviews or ratings pending."
                      : "You will be alerted here when new activity arrives."}
                  </p>
                </div>
              ) : (
                filteredNotifications.map((n) => {
                  const cat = getNotificationCategory(n);
                  const isUnread = !n.is_read;

                  return (
                    <div
                      key={n.id}
                      onClick={() => handleNotificationClick(n)}
                      className={`p-3.5 transition-all cursor-pointer relative group flex items-start gap-3 ${
                        isUnread
                          ? cat === "security"
                            ? "bg-red-50/40 hover:bg-red-50/70"
                            : "bg-rose-50/40 hover:bg-rose-50/70"
                          : "bg-white hover:bg-slate-50/80"
                      }`}
                    >
                      {/* Unread Glowing Dot */}
                      {isUnread && (
                        <span
                          className={`absolute left-1.5 top-5 w-1.5 h-1.5 rounded-full ring-4 ${
                            cat === "security"
                              ? "bg-red-600 ring-red-100"
                              : "bg-[#E8436E] ring-rose-100"
                          }`}
                        />
                      )}

                      {/* Visual Thumbnail or Rich Icon */}
                      <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-slate-200/80 shadow-2xs relative bg-slate-50 flex items-center justify-center">
                        {n.image_url ? (
                          <AuthenticatedImage
                            src={n.image_url}
                            productId={n.product_id || undefined}
                            alt={n.title || "Notification"}
                            className="w-full h-full object-cover"
                          />
                        ) : cat === "security" ? (
                          <div className="w-full h-full bg-gradient-to-br from-red-600 to-rose-800 flex items-center justify-center text-white shadow-2xs">
                            <ShieldAlert className="w-5 h-5 text-white" />
                          </div>
                        ) : cat === "orders" ? (
                          <div className="w-full h-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white">
                            <ShoppingBag className="w-5 h-5" />
                          </div>
                        ) : cat === "stock" ? (
                          <div className="w-full h-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white">
                            <Package className="w-5 h-5" />
                          </div>
                        ) : cat === "reviews" ? (
                          <div className="w-full h-full bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center text-white">
                            <Star className="w-5 h-5 fill-white" />
                          </div>
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center text-white">
                            <Bell className="w-5 h-5" />
                          </div>
                        )}
                      </div>

                      {/* Notification Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1.5 mb-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {/* Category Pill */}
                            <span
                              className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md ${
                                cat === "security"
                                  ? "bg-red-50 text-red-700 border border-red-200"
                                  : cat === "orders"
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : cat === "stock"
                                  ? n.type?.toLowerCase().includes("arrival") || n.title?.toLowerCase().includes("arrival")
                                    ? "bg-rose-50 text-rose-700 border border-rose-200"
                                    : "bg-amber-50 text-amber-700 border border-amber-200"
                                  : cat === "reviews"
                                  ? "bg-amber-50 text-amber-600 border border-amber-200"
                                  : "bg-slate-50 text-slate-700 border border-slate-200"
                              }`}
                            >
                              {cat === "security"
                                ? "SECURITY AUDIT"
                                : cat === "orders"
                                ? "SALE"
                                : cat === "stock"
                                ? n.type?.toLowerCase().includes("arrival") || n.title?.toLowerCase().includes("arrival")
                                  ? "NEW ARRIVAL"
                                  : "INVENTORY"
                                : cat === "reviews"
                                ? "REVIEW"
                                : "ALERT"}
                            </span>

                            {/* Order Number / Unique Code Tag */}
                            {(() => {
                              const titleText = n.title || "";
                              const bodyText = n.body || n.message || "";
                              const chipCode =
                                n.order_number ||
                                (titleText.match(/ORD-[\w\d-]+/i)?.[0] || bodyText.match(/ORD-[\w\d-]+/i)?.[0] || "")?.replace(/^#/, "") ||
                                n.unique_code;
                              return chipCode ? (
                                <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded">
                                  {chipCode}
                                </span>
                              ) : null;
                            })()}
                          </div>

                          {/* Relative Timestamp */}
                          <span className="text-[10px] font-medium text-slate-400 whitespace-nowrap">
                            {formatRelativeTime(n.created_at)}
                          </span>
                        </div>

                        {/* Title */}
                        <h4
                          className={`text-xs text-slate-900 leading-snug line-clamp-1 ${
                            isUnread ? "font-black" : "font-semibold"
                          }`}
                        >
                          {n.title}
                        </h4>

                        {/* Body / Message */}
                        <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5 leading-relaxed">
                          {n.body || n.message}
                        </p>

                        {/* Action Footer */}
                        <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-100/60">
                          <span
                            className={`text-[10px] font-bold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform ${
                              cat === "security" ? "text-red-600" : "text-[#E8436E]"
                            }`}
                          >
                            {cat === "security" ? "Inspect Audit Log →" : "Inspect details →"}
                          </span>

                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {isUnread && (
                              <button
                                type="button"
                                onClick={(e) => handleMarkAsRead(n.id, e)}
                                title="Mark read"
                                className="p-1 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors"
                              >
                                <Check className="w-3 h-3" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={(e) => handleDeleteNotification(n.id, e)}
                              title="Delete"
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer with Destination Shortcuts */}
            <div className="p-3 bg-slate-50/90 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span className="font-semibold text-slate-400">Quick Navigation:</span>
              <div className="flex items-center gap-2 font-bold text-slate-700">
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    router.push("/dashboard/orders");
                  }}
                  className="hover:text-[#E8436E] transition-colors"
                >
                  Orders
                </button>
                <span className="text-slate-300">&bull;</span>
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    router.push("/dashboard/products");
                  }}
                  className="hover:text-[#E8436E] transition-colors"
                >
                  Products
                </button>
                <span className="text-slate-300">&bull;</span>
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    router.push("/dashboard/reviews");
                  }}
                  className="hover:text-[#E8436E] transition-colors"
                >
                  Reviews
                </button>
                {userRole === "super_admin" && (
                  <>
                    <span className="text-slate-300">&bull;</span>
                    <button
                      type="button"
                      onClick={() => {
                        setIsOpen(false);
                        router.push("/dashboard/super-admin/audit-logs");
                      }}
                      className="hover:text-red-600 text-red-700 transition-colors flex items-center gap-1"
                    >
                      <ShieldAlert className="w-3 h-3 text-red-500" />
                      Audit Logs
                    </button>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
