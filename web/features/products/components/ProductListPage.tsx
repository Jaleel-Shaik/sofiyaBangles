"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Plus, Package, Zap } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import { api, type Product, type Category } from "@/src/lib/api";
import { QuickSellModal } from "./QuickSellModal";
import {
  Button,
  SearchInput,
  Card,
  Badge,
  ConfirmDialog,
  EmptyState,
  AppIcon,
} from "@/src/components/ui";
import { STRINGS } from "@/src/constants/strings";

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [quickSellOpen, setQuickSellOpen] = useState(false);

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

      {/* Filter / Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
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

      {/* Content Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div
              key={i}
              className="bg-white rounded-2xl border border-slate-200/80 animate-pulse shadow-2xs overflow-hidden"
            >
              <div className="aspect-4/3 bg-slate-200" />
              <div className="p-4 space-y-2.5">
                <div className="h-4 w-3/4 bg-slate-200 rounded" />
                <div className="h-3 w-1/2 bg-slate-200 rounded" />
                <div className="h-4 w-1/3 bg-slate-200 rounded" />
              </div>
            </div>
          ))}
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
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((product, i) => {
            const hasStock = (product.quantity || 0) > 0;
            return (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.02 }}
              >
                <Card hoverable className="flex flex-col h-full group">
                  <Link href={`/dashboard/products/${product.id}`} className="block">
                    <div className="aspect-4/3 bg-slate-100 overflow-hidden relative">
                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt={product.product_name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300">
                          <Package className="w-10 h-10" />
                        </div>
                      )}
                      {!product.is_active && (
                        <span className="absolute top-2 left-2 bg-black/75 text-white text-[10px] font-bold px-2 py-0.5 rounded-full backdrop-blur-xs">
                          {STRINGS.common.draft}
                        </span>
                      )}
                    </div>

                    <div className="p-4 space-y-1.5">
                      <p className="font-semibold text-slate-900 text-sm truncate group-hover:text-[#E8436E] transition-colors">
                        {product.product_name}
                      </p>
                      <p className="text-xs text-slate-400 font-medium">
                        {STRINGS.common.code}: {product.unique_code || "—"}
                      </p>
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-base font-extrabold text-[#E8436E]">
                          ₹{product.price}
                        </span>
                        <Badge variant={hasStock ? "success" : "danger"}>
                          {hasStock ? `${product.quantity} in stock` : STRINGS.common.outOfStock}
                        </Badge>
                      </div>
                    </div>
                  </Link>

                  <div className="flex items-center border-t border-slate-100 mt-auto bg-slate-50/50">
                    <Link
                      href={`/dashboard/products/${product.id}/edit`}
                      className="flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors min-h-[44px]"
                      aria-label={`Edit ${product.product_name}`}
                    >
                      <AppIcon name="edit" size={14} />
                      {STRINGS.common.edit}
                    </Link>
                    <div className="w-px h-6 bg-slate-200" />
                    <button
                      type="button"
                      onClick={() =>
                        setDeleteTarget({ id: product.id, name: product.product_name })
                      }
                      className="flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors min-h-[44px]"
                      aria-label={`Delete ${product.product_name}`}
                    >
                      <AppIcon name="delete" size={14} />
                      {STRINGS.common.delete}
                    </button>
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
    </div>
  );
}
