"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
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
  Layers,
} from "lucide-react";
import toast from "react-hot-toast";

import Link from "next/link";
import { usePathname } from "next/navigation";

const sidebarLinks = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
  { label: "Products", icon: Package, href: "/dashboard/products" },
  { label: "Categories", icon: ShoppingBag, href: "/dashboard/categories" },
  { label: "Model Types", icon: Layers, href: "/dashboard/model-types" },
  { label: "Settings", icon: Settings, href: "/dashboard/settings" },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/");
    }
  }, [isLoading, isAuthenticated, router]);

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
            className="fixed inset-0 bg-black/40 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.aside
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ type: "spring", damping: 25 }}
            className="fixed left-0 top-0 bottom-0 w-[280px] bg-white border-r border-[#E5E5E5] z-50 lg:hidden overflow-y-auto"
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

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-[280px] lg:fixed lg:inset-y-0 bg-white border-r border-[#E5E5E5]">
        <SidebarContent
          user={user!}
          onClose={() => {}}
          onLogout={handleLogout}
          loggingOut={loggingOut}
        />
      </aside>

      {/* Main content */}
      <div className="lg:pl-[280px]">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur border-b border-[#E5E5E5]">
          <div className="flex items-center justify-between h-16 px-4 lg:px-8">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden text-[#525252] hover:text-[#171717] transition-colors"
              >
                <Menu className="w-6 h-6" />
              </button>
            </div>

            <div className="flex items-center gap-3">
              {/* Notification bell */}
              <button className="p-2.5 rounded-xl bg-[#F5F5F5] hover:bg-[#E5E5E5] transition-colors relative">
                <Bell className="w-5 h-5 text-[#525252]" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#E8436E] rounded-full" />
              </button>

              {/* Profile dropdown */}
              <div className="relative">
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-[#F5F5F5] transition-colors"
                >
                  <div className="w-8 h-8 bg-gradient-to-br from-[#E8436E] to-[#CC3366] rounded-full flex items-center justify-center text-white text-sm font-semibold">
                    {user?.full_name?.charAt(0)?.toUpperCase() || "A"}
                  </div>
                  <div className="hidden sm:block text-left">
                    <p className="text-sm font-medium text-[#171717] leading-tight">
                      {user?.full_name || "Admin"}
                    </p>
                    <p className="text-xs text-[#A3A3A3] capitalize">
                      {user?.role || "admin"}
                    </p>
                  </div>
                  <ChevronDown className="w-4 h-4 text-[#A3A3A3] hidden sm:block" />
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
                      <button
                        onClick={() => setProfileOpen(false)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[#525252] hover:bg-[#F5F5F5] transition-colors"
                      >
                        <User className="w-4 h-4" />
                        Profile
                      </button>
                      <button
                        onClick={() => setProfileOpen(false)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[#525252] hover:bg-[#F5F5F5] transition-colors"
                      >
                        <Shield className="w-4 h-4" />
                        Security
                      </button>
                      <button
                        onClick={() => setProfileOpen(false)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[#525252] hover:bg-[#F5F5F5] transition-colors"
                      >
                        <Settings className="w-4 h-4" />
                        Settings
                      </button>
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

        {/* Page content */}
        <main className="p-4 lg:p-8">{children}</main>
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
  user: { full_name: string; role: string };
  onClose: () => void;
  onLogout: () => void;
  loggingOut: boolean;
}) {
  const pathname = usePathname();
  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center justify-between p-6 border-b border-[#E5E5E5]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-[#E8436E] to-[#CC3366] rounded-xl flex items-center justify-center">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#171717] leading-tight">
              Sofiya
            </h2>
            <p className="text-xs text-[#A3A3A3] -mt-0.5">Admin Portal</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="lg:hidden text-[#A3A3A3] hover:text-[#525252] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        <p className="px-3 text-xs font-semibold text-[#A3A3A3] uppercase tracking-wider mb-2">
          Main Menu
        </p>
        {sidebarLinks.map((link) => {
          // Exact match for root-level /dashboard, startsWith for sub-routes
          const active = pathname === link.href || (link.href !== "/dashboard" && pathname.startsWith(link.href + "/"));
          return (
            <Link
              key={link.label}
              href={link.href}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                active
                  ? "bg-[#FFF0F3] text-[#E8436E]"
                  : "text-[#525252] hover:bg-[#F5F5F5]"
              }`}
            >
              <link.icon
                className={`w-5 h-5 ${active ? "text-[#E8436E]" : ""}`}
              />
              {link.label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className="p-4 border-t border-[#E5E5E5]">
        <div className="flex items-center gap-3 px-3 py-2 mb-2">
          <div className="w-8 h-8 bg-gradient-to-br from-[#E8436E] to-[#CC3366] rounded-full flex items-center justify-center text-white text-sm font-semibold">
            {user?.full_name?.charAt(0)?.toUpperCase() || "A"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[#171717] truncate">
              {user?.full_name || "Admin"}
            </p>
            <p className="text-xs text-[#A3A3A3] capitalize">{user?.role}</p>
          </div>
        </div>
        <button
          onClick={onLogout}
          disabled={loggingOut}
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          {loggingOut ? "Signing out..." : "Sign out"}
        </button>
      </div>
    </div>
  );
}
