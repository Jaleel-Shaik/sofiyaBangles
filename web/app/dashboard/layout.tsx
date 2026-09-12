"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/features/auth/lib/auth-context";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  ShoppingBag,
  Settings,
  LogOut,
  Menu,
  X,
  Bell,
  Shield,
  ChevronDown,
  User,
  Package,
  PlusCircle,
  AlertTriangle,
  Users,
  UserCheck,
  TrendingUp,
  Layers,
  DollarSign,
  CheckCheck,
  FileText,
  ClipboardList,
} from "lucide-react";
import toast from "react-hot-toast";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { api } from "@/src/lib/api";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifsOpen, setNotifsOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loggingOut, setLoggingOut] = useState(false);

  const role = (user?.role || "").toLowerCase().trim();
  const isSuperAdmin = role === "super_admin" || role === "superadmin";

  const superAdminOnlyPaths = [
    "/dashboard/admins",
    "/dashboard/activity",
    "/dashboard/revenue",
    "/dashboard/forms",
  ];

  // Fetch notifications for super_admin
  useEffect(() => {
    if (user?.role === "super_admin") {
      api.superAdmin
        .getNotifications()
        .then((items) => setNotifications(items || []))
        .catch(() => {});
    }
  }, [user]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const handleMarkRead = async (id: string) => {
    try {
      await api.superAdmin.markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    } catch {}
  };

  // Redirect to login if not authenticated or not authorized
  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.push("/");
      } else if (user && user.role === "user") {
        logout().finally(() => {
          router.push("/");
        });
      } else if (user && !isSuperAdmin && superAdminOnlyPaths.some((p) => pathname.startsWith(p))) {
        toast.error("Access restricted to Super Administrators");
        router.replace("/dashboard");
      }
    }
  }, [isLoading, isAuthenticated, user, router, logout, isSuperAdmin, pathname]);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
      router.push("/");
    } catch {
      toast.error("Logout failed");
    } finally {
      setLoggingOut(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#E8436E] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[#737373]">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      {/* Mobile overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-40 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar for Mobile */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.aside
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ type: "spring", damping: 25 }}
            className="fixed left-0 top-0 bottom-0 w-64 bg-white border-r border-[#E5E5E5] z-50 md:hidden overflow-y-auto"
          >
            <SidebarContent
              user={user!}
              onClose={() => setSidebarOpen(false)}
              onLogout={handleLogout}
              loggingOut={loggingOut}
            />
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Desktop sidebar - Full Page Height Side Navigation */}
      <aside className="hidden md:flex md:flex-col md:w-64 md:fixed md:inset-y-0 bg-white border-r border-[#E5E5E5] z-30 shadow-sm">
        <SidebarContent
          user={user!}
          onClose={() => {}}
          onLogout={handleLogout}
          loggingOut={loggingOut}
        />
      </aside>

      {/* Main content area */}
      <div className="md:pl-64 flex flex-col min-h-screen w-full">
        {/* Header */}
        <header className="sticky top-0 z-20 bg-white/90 backdrop-blur border-b border-[#E5E5E5]">
          <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="md:hidden text-[#525252] hover:text-[#171717] transition-colors p-2 rounded-xl hover:bg-slate-100"
              >
                <Menu className="w-6 h-6" />
              </button>
            </div>

            <div className="flex items-center gap-3">
              {/* Notification bell */}
              <div className="relative">
                <button
                  onClick={() => setNotifsOpen(!notifsOpen)}
                  className="p-2.5 rounded-xl bg-[#F5F5F5] hover:bg-[#E5E5E5] transition-colors relative"
                >
                  <Bell className="w-5 h-5 text-[#525252]" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#E8436E] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </button>

                {/* Notifications Dropdown */}
                <AnimatePresence>
                  {notifsOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 5 }}
                      className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-slate-200 py-3 z-50 overflow-hidden"
                    >
                      <div className="px-4 pb-2 border-b border-slate-100 flex items-center justify-between">
                        <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                          <Bell className="w-4 h-4 text-[#E8436E]" /> Notifications
                        </h3>
                        {unreadCount > 0 && (
                          <span className="text-[10px] bg-rose-50 text-[#E8436E] font-bold px-2 py-0.5 rounded-full">
                            {unreadCount} new
                          </span>
                        )}
                      </div>

                      <div className="max-h-80 overflow-y-auto divide-y divide-slate-50">
                        {notifications.length === 0 ? (
                          <div className="p-6 text-center text-xs text-slate-400">
                            No notifications right now
                          </div>
                        ) : (
                          notifications.slice(0, 10).map((n) => (
                            <div
                              key={n.id}
                              className={`p-3 text-xs transition-colors ${
                                n.is_read ? "bg-white opacity-70" : "bg-rose-50/40"
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <p className="font-semibold text-slate-800 leading-tight">
                                  {n.title}
                                </p>
                                {!n.is_read && (
                                  <button
                                    onClick={() => handleMarkRead(n.id)}
                                    title="Mark as read"
                                    className="text-[#E8436E] hover:text-rose-700 p-0.5"
                                  >
                                    <CheckCheck className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-500 mt-1">{n.message}</p>
                            </div>
                          ))
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Profile dropdown */}
              <div className="relative">
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="flex items-center gap-3 p-1.5 rounded-xl hover:bg-[#F5F5F5] transition-colors"
                >
                  <div className="w-8 h-8 bg-gradient-to-br from-[#E8436E] to-[#CC3366] rounded-full flex items-center justify-center text-white text-sm font-semibold overflow-hidden shadow-sm">
                    {user?.avatar_url ? (
                      <Image
                        src={user.avatar_url}
                        alt=""
                        width={32}
                        height={32}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      user?.full_name?.charAt(0)?.toUpperCase() || "A"
                    )}
                  </div>
                  <div className="hidden sm:block text-left">
                    <p className="text-xs font-bold text-[#171717] leading-tight">
                      {user?.full_name || "Admin"}
                    </p>
                    <p className="text-[10px] text-[#A3A3A3] capitalize font-medium">{user?.role}</p>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-[#A3A3A3]" />
                </button>

                <AnimatePresence>
                  {profileOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 5 }}
                      className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-lg border border-[#E5E5E5] py-2 z-50"
                    >
                      <div className="px-4 py-2 border-b border-[#E5E5E5]">
                        <p className="text-sm font-medium text-[#171717]">
                          {user?.full_name}
                        </p>
                        <p className="text-xs text-[#A3A3A3]">{user?.email}</p>
                      </div>
                      <Link
                        href="/dashboard/settings/profile"
                        onClick={() => setProfileOpen(false)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[#525252] hover:bg-[#F5F5F5] transition-colors"
                      >
                        <User className="w-4 h-4" />
                        Profile
                      </Link>
                      <Link
                        href="/dashboard/settings/security"
                        onClick={() => setProfileOpen(false)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[#525252] hover:bg-[#F5F5F5] transition-colors"
                      >
                        <Shield className="w-4 h-4" />
                        Security
                      </Link>
                      <Link
                        href="/dashboard/settings"
                        onClick={() => setProfileOpen(false)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[#525252] hover:bg-[#F5F5F5] transition-colors"
                      >
                        <Settings className="w-4 h-4" />
                        Settings
                      </Link>
                      <div className="border-t border-[#E5E5E5] mt-1 pt-1">
                        <button
                          onClick={handleLogout}
                          disabled={loggingOut}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
                        >
                          <LogOut className="w-4 h-4" />
                          {loggingOut ? "Logging out..." : "Sign out"}
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </header>

        {/* Page content - Expands Full Width */}
        <main className="p-4 sm:p-6 lg:p-8 w-full flex-1">{children}</main>
      </div>
    </div>
  );
}

function SidebarContent({
  user,
  onClose,
  onLogout,
  loggingOut,
}: {
  user: { full_name: string; role: string; avatar_url?: string; email?: string };
  onClose: () => void;
  onLogout: () => void;
  loggingOut: boolean;
}) {
  const pathname = usePathname();
  const role = (user?.role || "").toLowerCase().trim();
  const isSuperAdmin = role === "super_admin" || role === "superadmin";

  // Regular Store Admin Navigation (6 core store management links only)
  const adminNavLinks = [
    { label: "Overview", icon: LayoutDashboard, href: "/dashboard" },
    { label: "Products Catalog", icon: Package, href: "/dashboard/products" },
    { label: "Orders & WhatsApp", icon: ShoppingBag, href: "/dashboard/orders" },
    { label: "Categories & Sizing", icon: Layers, href: "/dashboard/categories" },
    { label: "Model Types", icon: Layers, href: "/dashboard/model-types" },
    { label: "Store Settings", icon: Settings, href: "/dashboard/settings" },
  ];

  // Super-Admin Navigation (Store operations + full governance suite)
  const superAdminNavLinks = [
    { label: "Overview", icon: LayoutDashboard, href: "/dashboard" },
    { label: "Products Catalog", icon: Package, href: "/dashboard/products" },
    { label: "Orders & WhatsApp", icon: ShoppingBag, href: "/dashboard/orders" },
    { label: "Categories & Sizing", icon: Layers, href: "/dashboard/categories" },
    { label: "Model Types", icon: Layers, href: "/dashboard/model-types" },
    { label: "Product Operations Log", icon: ClipboardList, href: "/dashboard/activity" },
    { label: "70/30 Revenue Ledger", icon: TrendingUp, href: "/dashboard/revenue" },
    { label: "Staff Admins", icon: UserCheck, href: "/dashboard/admins" },
    { label: "Google Forms", icon: FileText, href: "/dashboard/forms" },
    { label: "Store Settings", icon: Settings, href: "/dashboard/settings" },
  ];

  const navLinks = isSuperAdmin ? superAdminNavLinks : adminNavLinks;

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Brand Header */}
      <div className="flex items-center justify-between p-4 border-b border-[#E5E5E5] shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-md shrink-0 bg-gradient-to-br from-[#E8436E] to-[#CC3366] text-white shadow-[#E8436E]/20">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#171717] leading-tight tracking-tight">
              Sofiya Bangles
            </h2>
            <p className="text-[10px] font-semibold text-slate-400 tracking-wider">
              Store Management
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="md:hidden text-[#A3A3A3] hover:text-[#525252] transition-colors p-1"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Continuous Navigation List (Fills the available space, strictly role-based) */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navLinks.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href + "/"));

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={`group relative flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                active
                  ? "bg-rose-50 text-[#E8436E] font-bold shadow-sm shadow-rose-100/50"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium"
              }`}
            >
              {active && (
                <span className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-[#E8436E] rounded-r-full" />
              )}
              <item.icon
                className={`w-4 h-4 transition-colors shrink-0 ${
                  active ? "text-[#E8436E]" : "text-slate-400 group-hover:text-slate-700"
                }`}
              />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Docked Bottom Bar: Button + Profile directly attached (Zero empty gap) */}
      <div className="p-3 border-t border-[#E5E5E5] bg-slate-50/50 space-y-2.5 shrink-0">
        <Link
          href="/dashboard/products/new"
          onClick={onClose}
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-[#E8436E] to-[#CC3366] text-white shadow-md shadow-[#E8436E]/20 hover:brightness-105 transition-all"
        >
          <PlusCircle className="w-4 h-4" />
          Add New Bangles
        </Link>

        <div className="flex items-center gap-3 px-1 pt-1">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold overflow-hidden shadow-sm shrink-0 bg-gradient-to-br from-[#E8436E] to-[#CC3366]">
            {user?.avatar_url ? (
              <Image src={user.avatar_url} alt="" width={32} height={32} className="w-full h-full object-cover" />
            ) : (
              user?.full_name?.charAt(0)?.toUpperCase() || "A"
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-[#171717] truncate">
              {user?.full_name || "Admin"}
            </p>
            <p className="text-[10px] text-slate-400 truncate font-medium">
              {user?.email || "Logged In"}
            </p>
          </div>
          <button
            onClick={onLogout}
            disabled={loggingOut}
            title="Sign out"
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

