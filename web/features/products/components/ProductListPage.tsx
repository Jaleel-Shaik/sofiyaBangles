"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Plus, Package, Zap, LayoutGrid, List, Eye, ArrowUpRight, Tag } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import { api, type Product, type Category } from "@/src/lib/api";
import { QuickSellModal } from "./QuickSellModal";
import { StockModal } from "./StockModal";
import {
  Button,
  SearchInput,
  Card,
  Badge,
  ConfirmDialog,
  EmptyState,
  AppIcon,
  AuthenticatedImage,
} from "@/src/components/ui";
import { STRINGS } from "@/src/constants/strings";

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [quickSellOpen, setQuickSellOpen] = useState(false);
  const [stockModalTarget, setStockModalTarget] = useState<Product | null>(null);

  // Confirm delete dialog state
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [prodRes, cats] = await Promise.all([
        api.admin.getAdminProducts(1, 100),
        api.admin.getCategories(),
      ]);
      setProducts(prodRes.products || []);
      setCategories(cats || []);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || "Failed to load products";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const cat = params.get("category");
      if (cat) {
        setCategoryFilter(cat);
      }
      const searchQueryParam = params.get("search") || params.get("code") || params.get("q");
      if (searchQueryParam) {
        setSearch(searchQueryParam);
      }
    }
  }, []);

  const confirmDeleteProduct = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await api.admin.deleteProduct(deleteTarget.id);
      toast.success(STRINGS.products.deletedSuccess);
      setDeleteTarget(null);
      fetchData();
    } catch {
      toast.error("Failed to delete product");
    } finally {
      setIsDeleting(false);
    }
  };

  const filtered = products.filter((p) => {
    const lower = search.toLowerCase().trim();
    const matchesSearch =
      !lower ||
      p.product_name.toLowerCase().includes(lower) ||
      (p.unique_code && p.unique_code.toLowerCase().includes(lower)) ||
      (p.description && p.description.toLowerCase().includes(lower));
    const matchesCategory = !categoryFilter || p.category_id === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            {STRINGS.products.title}
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            {STRINGS.products.subtitle(products.length)}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="accent"
            size="md"
            onClick={() => setQuickSellOpen(true)}
            leftIcon={<Zap className="w-4 h-4 text-amber-400 fill-amber-400" />}
          >
            {STRINGS.products.quickSellButton}
          </Button>

          <Link href="/dashboard/products/new">
            <Button
              variant="primary"
              size="md"
              leftIcon={<Plus className="w-4 h-4" />}
            >
              {STRINGS.products.addProduct}
            </Button>
          </Link>
        </div>
      </div>

      {/* Filter / Search Bar with View Switcher */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-3 flex-1">
          <SearchInput
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onClear={() => setSearch("")}
            placeholder={STRINGS.products.searchPlaceholder}
          />

          <div className="sm:w-64 shrink-0">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full min-h-[44px] px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl outline-none transition-all duration-200 text-xs font-semibold text-slate-700 focus:border-[#E8436E] focus:ring-2 focus:ring-rose-500/15 hover:border-slate-300 cursor-pointer"
              aria-label={STRINGS.products.allCategories}
            >
              <option value="">{STRINGS.products.allCategories}</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.category_name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* View Mode Toggle Buttons (Table / Grid) */}
        <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setViewMode("table")}
            className={`p-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${
              viewMode === "table"
                ? "bg-rose-50 text-[#E8436E] border border-rose-200"
                : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
            }`}
            title="List Table View"
          >
            <List className="w-4 h-4" />
            <span className="hidden sm:inline">Table</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode("grid")}
            className={`p-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${
              viewMode === "grid"
                ? "bg-rose-50 text-[#E8436E] border border-rose-200"
                : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
            }`}
            title="Compact Grid View"
          >
            <LayoutGrid className="w-4 h-4" />
            <span className="hidden sm:inline">Grid</span>
          </button>
        </div>
      </div>

      {/* Content Section */}
      {loading ? (
        <div className="py-16 text-center">
          <div className="w-8 h-8 border-3 border-[#E8436E] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-xs font-medium text-slate-500">Loading products inventory...</p>
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Package className="w-8 h-8" />}
          title={STRINGS.products.emptyTitle}
          description={STRINGS.products.emptyDescription}
          actionLabel={STRINGS.products.addFirstProduct}
          onAction={() => {
            if (search || categoryFilter) {
              setSearch("");
              setCategoryFilter("");
            } else {
              window.location.href = "/dashboard/products/new";
            }
          }}
        />
      ) : viewMode === "table" ? (
        /* Standardized Table View */
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase font-black tracking-wider">
                <tr>
                  <th className="p-3.5 pl-4">Product Info</th>
                  <th className="p-3.5">Code</th>
                  <th className="p-3.5">Price</th>
                  <th className="p-3.5">Stock</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right pr-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filtered.map((product) => {
                  const hasStock = (product.quantity || 0) > 0;
                  const categoryName =
                    categories.find((c) => c.id === product.category_id)?.category_name ||
                    product.category_name ||
                    "Bangles";

                  return (
                    <tr key={product.id} className="hover:bg-slate-50/80 transition-colors group">
                      {/* Product Thumbnail & Name */}
                      <td className="p-3.5 pl-4">
                        <div className="flex items-center gap-3">
                          <Link
                            href={`/dashboard/products/${product.id}`}
                            className="w-10 h-10 rounded-lg bg-slate-100 overflow-hidden border border-slate-200 shrink-0 relative block shadow-2xs group-hover:border-[#E8436E] transition-colors"
                          >
                            {product.image_url ? (
                              <AuthenticatedImage
                                src={product.image_url}
                                productId={product.id}
                                imageIndex={0}
                                alt={product.product_name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-400">
                                <Package className="w-4 h-4" />
                              </div>
                            )}
                          </Link>
                          <div>
                            <Link
                              href={`/dashboard/products/${product.id}`}
                              className="font-extrabold text-slate-900 hover:text-[#E8436E] transition-colors flex items-center gap-1"
                            >
                              {product.product_name}
                              <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400" />
                            </Link>
                            <p className="text-[11px] text-slate-400 font-semibold">{categoryName}</p>
                          </div>
                        </div>
                      </td>

                      {/* Unique Code */}
                      <td className="p-3.5">
                        {product.unique_code ? (
                          <span className="bg-slate-100 text-slate-700 font-mono font-extrabold text-[10px] px-1.5 py-0.5 rounded border border-slate-200 inline-flex items-center gap-0.5">
                            <Tag className="w-2.5 h-2.5 text-slate-400" />
                            {product.unique_code.startsWith("#") ? product.unique_code : `#${product.unique_code}`}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-mono text-[11px]">#—</span>
                        )}
                      </td>

                      {/* Price */}
                      <td className="p-3.5 font-extrabold text-[#E8436E] text-sm">
                        ₹{product.price}
                      </td>

                      {/* Stock */}
                      <td className="p-3.5">
                        <button
                          type="button"
                          onClick={() => setStockModalTarget(product)}
                          className="hover:underline focus:outline-none"
                          title="Click to adjust stock"
                        >
                          <Badge variant={hasStock ? "success" : "danger"}>
                            {hasStock ? `${product.quantity} in stock` : STRINGS.common.outOfStock}
                          </Badge>
                        </button>
                      </td>

                      {/* Status */}
                      <td className="p-3.5">
                        {product.is_active ? (
                          <span className="bg-emerald-50 text-emerald-700 text-[10px] font-black px-2 py-0.5 rounded-full border border-emerald-200">
                            Active
                          </span>
                        ) : (
                          <span className="bg-slate-100 text-slate-500 text-[10px] font-black px-2 py-0.5 rounded-full border border-slate-200">
                            Draft
                          </span>
                        )}
                      </td>

                      {/* Action Buttons */}
                      <td className="p-3.5 pr-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            href={`/dashboard/products/${product.id}`}
                            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                          <button
                            type="button"
                            onClick={() => setStockModalTarget(product)}
                            className="p-1.5 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Update Stock"
                          >
                            <Package className="w-4 h-4" />
                          </button>
                          <Link
                            href={`/dashboard/products/${product.id}/edit`}
                            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Edit Product"
                          >
                            <AppIcon name="edit" size={16} />
                          </Link>
                          <button
                            type="button"
                            onClick={() =>
                              setDeleteTarget({ id: product.id, name: product.product_name })
                            }
                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Delete Product"
                          >
                            <AppIcon name="delete" size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Standardized Compact Grid View */
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3.5">
          {filtered.map((product, i) => {
            const hasStock = (product.quantity || 0) > 0;
            return (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.02 }}
              >
                <Card hoverable className="flex flex-col h-full group overflow-hidden">
                  <Link href={`/dashboard/products/${product.id}`} className="block">
                    {/* Compact Image Thumb Container (h-28) */}
                    <div className="h-28 bg-slate-100 overflow-hidden relative">
                      {product.image_url ? (
                        <AuthenticatedImage
                          src={product.image_url}
                          productId={product.id}
                          imageIndex={0}
                          alt={product.product_name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300">
                          <Package className="w-7 h-7" />
                        </div>
                      )}
                      {product.unique_code && (
                        <span className="absolute top-1.5 left-1.5 bg-slate-900/85 backdrop-blur-xs text-white text-[9px] font-mono font-bold px-1.5 py-0.5 rounded shadow-2xs z-10">
                          {product.unique_code.startsWith("#") ? product.unique_code : `#${product.unique_code}`}
                        </span>
                      )}
                      {!product.is_active && (
                        <span className="absolute top-1.5 right-1.5 bg-black/75 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full backdrop-blur-xs z-10">
                          {STRINGS.common.draft}
                        </span>
                      )}
                    </div>

                    <div className="p-3 space-y-1">
                      <p className="font-extrabold text-slate-900 text-xs truncate group-hover:text-[#E8436E] transition-colors">
                        {product.product_name}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-slate-400 font-mono font-bold">
                          {product.unique_code ? `#${product.unique_code}` : "—"}
                        </span>
                        <span className="text-xs font-black text-[#E8436E]">
                          ₹{product.price}
                        </span>
                      </div>
                      <div className="pt-1">
                        <Badge variant={hasStock ? "success" : "danger"}>
                          {hasStock ? `${product.quantity} in stock` : STRINGS.common.outOfStock}
                        </Badge>
                      </div>
                    </div>
                  </Link>

                  <div className="flex items-center border-t border-slate-100 mt-auto bg-slate-50/50">
                    <button
                      type="button"
                      onClick={() => setStockModalTarget(product)}
                      className="flex-1 flex items-center justify-center gap-1 py-2 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-50 transition-colors"
                      title="Update Stock"
                    >
                      <Package className="w-3 h-3 text-emerald-600" />
                      Stock ({product.quantity || 0})
                    </button>
                    <div className="w-px h-5 bg-slate-200" />
                    <Link
                      href={`/dashboard/products/${product.id}/edit`}
                      className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                      title="Edit Product"
                    >
                      <AppIcon name="edit" size={13} />
                    </Link>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Accessible Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDeleteProduct}
        isLoading={isDeleting}
        title={STRINGS.products.deleteConfirmTitle}
        message={deleteTarget ? STRINGS.products.deleteConfirmMessage(deleteTarget.name) : ""}
      />

      {/* Quick Sell Modal */}
      <QuickSellModal
        isOpen={quickSellOpen}
        onClose={() => setQuickSellOpen(false)}
        onSaleSuccess={() => fetchData()}
      />

      {/* Stock Management Modal */}
      {stockModalTarget && (
        <StockModal
          product={stockModalTarget}
          isOpen={Boolean(stockModalTarget)}
          onClose={() => setStockModalTarget(null)}
          onStockUpdated={(updated) => {
            setProducts((prev) =>
              prev.map((p) =>
                p.id === updated.id
                  ? { ...p, quantity: updated.quantity, variants: updated.variants }
                  : p
              )
            );
            fetchData();
          }}
        />
      )}
    </div>
  );
}
