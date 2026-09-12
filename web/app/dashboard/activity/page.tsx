"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/features/auth/lib/auth-context";
import Link from "next/link";
import { api } from "@/src/lib/api";
import {
  Package,
  PlusCircle,
  Edit,
  Trash2,
  Search,
  Filter,
  Layers,
  Clock,
  ArrowRight,
  TrendingDown,
  ShoppingBag,
  Shield,
} from "lucide-react";

type ProductFilterTab = "ALL" | "CREATED" | "UPDATED" | "DELETED" | "STOCK";

export default function AdminProductActivityPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ProductFilterTab>("ALL");
  const [search, setSearch] = useState("");

  const fetchActivity = async () => {
    setLoading(true);
    try {
      const res = await api.superAdmin.getAdminActivity({ page, limit: 50 });
      setItems(res.items || []);
      setTotal(res.total || 0);
    } catch (error) {
      console.error("Failed to load product activity logs:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === "super_admin") {
      fetchActivity();
    }
  }, [page, user]);

  if (!authLoading && user && user.role !== "super_admin") {
    return (
      <div className="bg-white border border-rose-200 rounded-2xl p-8 text-center max-w-lg mx-auto mt-10 shadow-sm">
        <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Shield className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900 mb-2">SuperAdmin Access Required</h2>
        <p className="text-xs text-slate-500 mb-6">
          Monitoring admin operations and catalog audit trails is restricted to Super-Administrators.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 bg-[#E8436E] text-white px-5 py-2.5 rounded-xl text-xs font-bold hover:bg-[#CC3366] transition-colors"
        >
          Return to Store Dashboard
        </Link>
      </div>
    );
  }

  const getActionDisplay = (action: string) => {
    const act = (action || "").toUpperCase();
    switch (act) {
      case "PRODUCT_CREATED":
        return {
          label: "Product Added",
          badge: "bg-emerald-100 text-emerald-800 border-emerald-200",
          icon: PlusCircle,
          iconColor: "text-emerald-600",
        };
      case "PRODUCT_UPDATED":
        return {
          label: "Product Edited",
          badge: "bg-blue-100 text-blue-800 border-blue-200",
          icon: Edit,
          iconColor: "text-blue-600",
        };
      case "PRODUCT_DELETED":
        return {
          label: "Product Deleted",
          badge: "bg-rose-100 text-rose-800 border-rose-200",
          icon: Trash2,
          iconColor: "text-rose-600",
        };
      case "STOCK_UPDATED":
        return {
          label: "Stock Changed",
          badge: "bg-purple-100 text-purple-800 border-purple-200",
          icon: Layers,
          iconColor: "text-purple-600",
        };
      case "PRODUCT_SOLD":
        return {
          label: "Stock Reduced (Sold)",
          badge: "bg-amber-100 text-amber-800 border-amber-200",
          icon: TrendingDown,
          iconColor: "text-amber-600",
        };
      default:
        return {
          label: act.replace(/_/g, " "),
          badge: "bg-slate-100 text-slate-700 border-slate-200",
          icon: Package,
          iconColor: "text-slate-500",
        };
    }
  };

  const formatProductDetails = (log: any) => {
    const productName =
      log.new_data?.product_name ||
      log.old_data?.product_name ||
      log.details ||
      (log.record_id ? `Product #${log.record_id.slice(0, 8)}` : "Bangles Item");

    const oldPrice = log.old_data?.price;
    const newPrice = log.new_data?.price;
    const oldQty = log.old_data?.quantity;
    const newQty = log.new_data?.quantity;

    return (
      <div className="text-xs space-y-1">
        <p className="font-bold text-slate-900">{productName}</p>

        {/* Price changes */}
        {oldPrice !== undefined && newPrice !== undefined && oldPrice !== newPrice && (
          <div className="flex items-center gap-1.5 text-[11px] text-slate-600">
            <span>Price:</span>
            <span className="line-through text-slate-400">₹{oldPrice}</span>
            <ArrowRight className="w-3 h-3 text-slate-400" />
            <span className="font-bold text-emerald-700">₹{newPrice}</span>
          </div>
        )}

        {/* Stock changes */}
        {oldQty !== undefined && newQty !== undefined && (
          <div className="flex items-center gap-1.5 text-[11px] text-slate-600">
            <span>Inventory Stock:</span>
            <span className="text-slate-500">{oldQty} units</span>
            <ArrowRight className="w-3 h-3 text-slate-400" />
            <span className="font-bold text-purple-700">{newQty} units</span>
          </div>
        )}

        {/* Initial creation info */}
        {oldPrice === undefined && newPrice !== undefined && (
          <p className="text-[11px] text-slate-500">Initial Price: ₹{newPrice}</p>
        )}
      </div>
    );
  };

  // Filter items strictly for products
  const filteredItems = items.filter((log) => {
    const act = (log.action || "").toUpperCase();

    // Tab filter
    if (activeTab === "CREATED" && act !== "PRODUCT_CREATED") return false;
    if (activeTab === "UPDATED" && act !== "PRODUCT_UPDATED") return false;
    if (activeTab === "DELETED" && act !== "PRODUCT_DELETED") return false;
    if (activeTab === "STOCK" && act !== "STOCK_UPDATED" && act !== "PRODUCT_SOLD")
      return false;

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      const actorMatch =
        (log.actor_name || "").toLowerCase().includes(q) ||
        (log.actor_email || "").toLowerCase().includes(q);
      const actionMatch = act.toLowerCase().includes(q);
      const productMatch = JSON.stringify(log.new_data || {})
        .toLowerCase()
        .includes(q) ||
        JSON.stringify(log.old_data || {})
          .toLowerCase()
          .includes(q);
      return actorMatch || actionMatch || productMatch;
    }
    return true;
  });

  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Package className="w-6 h-6 text-[#E8436E]" /> Product Operations Log
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Complete audit record of products added, edited, deleted, and inventory stock changes performed by store administrators.
          </p>
        </div>

        <span className="text-xs font-semibold px-3.5 py-1.5 rounded-xl bg-rose-50 text-[#E8436E] border border-rose-100 self-start sm:self-auto">
          {total} Product Actions Logged
        </span>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Product Operation Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl overflow-x-auto">
          <button
            onClick={() => setActiveTab("ALL")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === "ALL"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            All Product Actions
          </button>
          <button
            onClick={() => setActiveTab("CREATED")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === "CREATED"
                ? "bg-white text-emerald-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <PlusCircle className="w-3.5 h-3.5 text-emerald-600" /> Added
          </button>
          <button
            onClick={() => setActiveTab("UPDATED")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === "UPDATED"
                ? "bg-white text-blue-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Edit className="w-3.5 h-3.5 text-blue-600" /> Edited
          </button>
          <button
            onClick={() => setActiveTab("DELETED")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === "DELETED"
                ? "bg-white text-rose-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-600" /> Deleted
          </button>
          <button
            onClick={() => setActiveTab("STOCK")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === "STOCK"
                ? "bg-white text-purple-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-purple-600" /> Stock Changes
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search admin, product name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#E8436E]"
          />
        </div>
      </div>

      {/* Product Operations Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            Loading product operational audit stream...
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs font-medium">
            No product operations recorded yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-bold">
                <tr>
                  <th className="p-4">Time</th>
                  <th className="p-4">Admin Performer</th>
                  <th className="p-4">Operation</th>
                  <th className="p-4">Product & Changes</th>
                  <th className="p-4">Admin Role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredItems.map((log) => {
                  const display = getActionDisplay(log.action);
                  const Icon = display.icon;

                  return (
                    <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Timestamp */}
                      <td className="p-4 text-slate-500 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{new Date(log.created_at).toLocaleString()}</span>
                        </div>
                      </td>

                      {/* Admin Performer */}
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 font-bold text-[11px] shrink-0">
                            {log.actor_name?.charAt(0)?.toUpperCase() || "A"}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 leading-tight">
                              {log.actor_name || "Store Administrator"}
                            </p>
                            {log.actor_email && (
                              <p className="text-[10px] text-slate-400 leading-tight">
                                {log.actor_email}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Operation */}
                      <td className="p-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border ${display.badge}`}
                        >
                          <Icon className={`w-3 h-3 ${display.iconColor}`} />
                          {display.label}
                        </span>
                      </td>

                      {/* Product Details & Changes */}
                      <td className="p-4 max-w-md">{formatProductDetails(log)}</td>

                      {/* Admin Role */}
                      <td className="p-4">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                          {log.actor_role || (log.user_type === "super_admin" ? "SuperAdmin" : "Admin")}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        <div className="p-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>Page {page} of {Math.ceil(total / 50) || 1}</span>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 font-semibold"
            >
              Previous
            </button>
            <button
              disabled={page * 50 >= total}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 font-semibold"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
