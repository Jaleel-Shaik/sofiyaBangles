"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Edit, Trash2, Package, Loader2, ShoppingCart, Minus, Plus } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import { type Product, api } from "@/src/lib/api";
import { Button, Badge, Card, CardContent, CardHeader, CardTitle, ConfirmDialog } from "@/src/components/ui";
import { STRINGS } from "@/src/constants/strings";

export default function ProductDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = params.id as string;
  const rawQty = searchParams?.get("qty");
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [sellQty, setSellQty] = useState(() => (rawQty ? Math.max(1, parseInt(rawQty, 10) || 1) : 1));
  const [selling, setSelling] = useState(false);

  // ConfirmDialog state
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

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

  const handleDeleteConfirm = async () => {
    if (!product) return;
    setDeleting(true);
    try {
      await api.admin.deleteProduct(id);
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
    setSelling(true);
    try {
      const updated = await api.admin.sellProduct(id, sellQty);
      setProduct(updated);
      setSellQty(1);
      toast.success(`Sold ${sellQty} unit(s)!`);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || e?.message || "Failed to sell product");
    } finally {
      setSelling(false);
    }
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
          <Link href={`/dashboard/products/${id}/edit`}>
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
                <Badge variant={isOutOfStock ? "danger" : "neutral"}>
                  {isOutOfStock ? STRINGS.common.outOfStock : `${product.quantity} units`}
                </Badge>
              </div>
              {product.has_variants && product.variants && product.variants.length > 0 && (
                <div className="flex justify-between items-center py-1 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">Available Variants</span>
                  <span className="font-semibold text-slate-700">
                    {product.variants.length} standard sizes
                  </span>
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
                    className="aspect-square rounded-xl bg-slate-50 overflow-hidden border border-slate-200/80 shadow-2xs"
                  >
                    <img
                      src={typeof img === "string" ? img : img.image_url}
                      alt=""
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

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-[#E8436E]" />
                Sell Product Directly
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isOutOfStock ? (
                <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-sm font-semibold">
                  Cannot sell — product is out of stock.
                </div>
              ) : (
                <div className="space-y-4">
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
                      Sell Now
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
    </div>
  );
}
