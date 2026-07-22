"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/src/lib/auth-context";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingBag,
  Users,
  Package,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Shield,
  ShieldOff,
  Smartphone,
  Activity,
  Clock,
  CheckCircle2,
  XCircle,
} from "lucide-react";

// Mock data for demo
const statsCards = [
  {
    label: "Total Revenue",
    value: "$48,250",
    change: "+12.5%",
    trend: "up",
    icon: DollarSign,
    color: "text-green-500 bg-green-50",
  },
  {
    label: "Active Orders",
    value: "156",
    change: "+8.2%",
    trend: "up",
    icon: ShoppingBag,
    color: "text-blue-500 bg-blue-50",
  },
  {
    label: "Total Products",
    value: "1,432",
    change: "+3.1%",
    trend: "up",
    icon: Package,
    color: "text-purple-500 bg-purple-50",
  },
  {
    label: "New Customers",
    value: "89",
    change: "-2.4%",
    trend: "down",
    icon: Users,
    color: "text-amber-500 bg-amber-50",
  },
];

const recentOrders = [
  {
    id: "#ORD-001",
    customer: "Sarah Johnson",
    product: "Gold Bangles Set",
    amount: "$1,250",
    status: "completed",
  },
  {
    id: "#ORD-002",
    customer: "Emily Davis",
    product: "Silver Anklets",
    amount: "$450",
    status: "processing",
  },
  {
    id: "#ORD-003",
    customer: "Maria Garcia",
    product: "Bridal Collection",
    amount: "$3,200",
    status: "pending",
  },
  {
    id: "#ORD-004",
    customer: "Lisa Chen",
    product: "Pearl Necklace",
    amount: "$890",
    status: "completed",
  },
  {
    id: "#ORD-005",
    customer: "Anna Wilson",
    product: "Diamond Earrings",
    amount: "$2,100",
    status: "processing",
  },
];

export default function DashboardPage() {
  const { user, refreshUser, getSessions } = useAuth();
  const [sessions, setSessions] = useState<any[]>([]);
  const [showSessions, setShowSessions] = useState(false);

  useEffect(() => {
    refreshUser();
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      const data = await getSessions();
      setSessions(data);
    } catch {
      // Silently fail
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#171717]">Dashboard</h1>
            <p className="text-[#737373] mt-1">
              Welcome back, {user?.full_name || "Admin"}
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-[#A3A3A3]">
            <Shield className="w-3.5 h-3.5" />
            <span>Secured with 2FA</span>
          </div>
        </div>
      </motion.div>

      {/* 2FA Status */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-2xl border border-[#E5E5E5] p-4 flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
            <Shield className="w-5 h-5 text-green-500" />
          </div>
          <div>
            <p className="text-sm font-medium text-[#171717]">
              2FA Authentication Active
            </p>
            <p className="text-xs text-[#A3A3A3]">
              Google Authenticator - Last verified today
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowSessions(!showSessions)}
          className="text-sm text-[#E8436E] hover:text-[#CC3366] font-medium transition-colors"
        >
          {showSessions ? "Hide Sessions" : "View Sessions"}
        </button>
      </motion.div>

      {/* Active Sessions */}
      <AnimatePresence>
        {showSessions && sessions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-white rounded-2xl border border-[#E5E5E5] overflow-hidden"
          >
            <div className="p-4 border-b border-[#E5E5E5]">
              <h3 className="text-sm font-semibold text-[#171717]">
                Active Sessions
              </h3>
            </div>
            <div className="divide-y divide-[#E5E5E5]">
              {sessions.map((session: any) => (
                <div
                  key={session.id}
                  className="p-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-[#F5F5F5] rounded-lg flex items-center justify-center">
                      <Smartphone className="w-4 h-4 text-[#525252]" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[#171717]">
                        {session.device_info?.browser || "Unknown Browser"} on{" "}
                        {session.device_info?.os || "Unknown OS"}
                      </p>
                      <p className="text-xs text-[#A3A3A3]">
                        IP: {session.device_info?.ip_address || "Unknown"} ·{" "}
                        {session.client_type || "web"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full" />
                    <span className="text-xs text-green-600 font-medium">
                      Active
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsCards.map((card, index) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * index }}
            className="bg-white rounded-2xl border border-[#E5E5E5] p-5 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-3">
              <div className={`p-2.5 rounded-xl ${card.color}`}>
                <card.icon className="w-5 h-5" />
              </div>
              <span
                className={`flex items-center gap-1 text-xs font-medium ${
                  card.trend === "up" ? "text-green-600" : "text-red-500"
                }`}
              >
                {card.trend === "up" ? (
                  <TrendingUp className="w-3 h-3" />
                ) : (
                  <TrendingDown className="w-3 h-3" />
                )}
                {card.change}
              </span>
            </div>
            <p className="text-2xl font-bold text-[#171717]">{card.value}</p>
            <p className="text-xs text-[#A3A3A3] mt-1">{card.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Recent Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-2xl border border-[#E5E5E5]"
        >
          <div className="p-5 border-b border-[#E5E5E5] flex items-center justify-between">
            <h3 className="text-base font-semibold text-[#171717]">
              Recent Orders
            </h3>
            <button className="text-xs text-[#E8436E] hover:text-[#CC3366] font-medium transition-colors">
              View All
            </button>
          </div>
          <div className="divide-y divide-[#E5E5E5]">
            {recentOrders.map((order) => (
              <div
                key={order.id}
                className="p-4 flex items-center justify-between hover:bg-[#FAFAFA] transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#171717] truncate">
                    {order.product}
                  </p>
                  <p className="text-xs text-[#A3A3A3]">
                    {order.id} · {order.customer}
                  </p>
                </div>
                <div className="text-right ml-4">
                  <p className="text-sm font-semibold text-[#171717]">
                    {order.amount}
                  </p>
                  <span
                    className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${
                      order.status === "completed"
                        ? "bg-green-50 text-green-600"
                        : order.status === "processing"
                        ? "bg-blue-50 text-blue-600"
                        : "bg-amber-50 text-amber-600"
                    }`}
                  >
                    {order.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Activity / Security Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-2xl border border-[#E5E5E5]"
        >
          <div className="p-5 border-b border-[#E5E5E5]">
            <h3 className="text-base font-semibold text-[#171717]">
              Security Status
            </h3>
          </div>
          <div className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-green-500" />
                <div>
                  <p className="text-sm font-medium text-[#171717]">
                    2-Factor Authentication
                  </p>
                  <p className="text-xs text-[#A3A3A3]">Google Authenticator</p>
                </div>
              </div>
              <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Active
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Activity className="w-5 h-5 text-[#E8436E]" />
                <div>
                  <p className="text-sm font-medium text-[#171717]">
                    Login Activity
                  </p>
                  <p className="text-xs text-[#A3A3A3]">Last login today</p>
                </div>
              </div>
              <span className="text-xs text-[#A3A3A3]">Normal</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-blue-500" />
                <div>
                  <p className="text-sm font-medium text-[#171717]">
                    Session Duration
                  </p>
                  <p className="text-xs text-[#A3A3A3]">7 days until refresh</p>
                </div>
              </div>
              <span className="text-xs text-[#A3A3A3]">Active</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-purple-500" />
                <div>
                  <p className="text-sm font-medium text-[#171717]">
                    Active Sessions
                  </p>
                  <p className="text-xs text-[#A3A3A3]">
                    {sessions.length} device(s) connected
                  </p>
                </div>
              </div>
              <span className="text-xs text-[#A3A3A3]">
                {sessions.length} active
              </span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
