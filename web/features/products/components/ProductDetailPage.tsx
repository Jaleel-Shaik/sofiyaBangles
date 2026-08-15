"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Edit, Trash2, Package, Loader2, ShoppingCart, Minus, Plus } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import { adminApi, type Product } from "@/src/lib/api";

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [sellQty, setSellQty] = useState(1);
  const [selling, setSelling] = useState(false);

  const fetchProduct = async () => {
    try {
      const prod = await adminApi.getProductById(id);
      setProduct(prod);
    } catch {
      toast.error("Failed to load product");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProduct(); }, [id]);

  const handleDelete = async () => {
    if (!product) return;
    if (!confirm(`Delete "${product.product_name}"? This action cannot be undone.`)) return;
    try {
      await adminApi.deleteProduct(id);
      toast.success("Product deleted");
      router.push("/dashboard/products");
    } catch {
      toast.error("Failed to delete product");
    }
  };

  const handleSell = async () => {
    if (!product) return;
    if (sellQty < 1) { toast.error("Quantity must be at least 1"); return; }
    if (sellQty > product.quantity) { toast.error("Not enough stock"); return; }
    setSelling(true);
    try {
      const updated = await adminApi.sellProduct(id, sellQty);
      setProduct(updated);
      setSellQty(1);
      toast.success(`Sold ${sellQty} unit(s)!`);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || e?.message || "Failed to sell product");
    } finally {
      setSelling(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-[#E8436E]" /></div>;
  if (!product) return <div className="text-center py-20 text-[#A3A3A3]">Product not found</div>;

  const isOutOfStock = product.quantity <= 0;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/products" className="p-2 rounded-xl hover:bg-[#F5F5F5]">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-[#171717]">{product.product_name}</h1>
          <p className="text-[#737373] text-sm">Code: {product.unique_code}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/dashboard/products/${id}/edit`}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#F5F5F5] hover:bg-[#E5E5E5] transition-colors text-sm font-medium text-[#525252]"
          >
            <Edit className="w-4 h-4" />
            Edit
          </Link>
          <button
            onClick={handleDelete}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 transition-colors text-sm font-medium text-red-500"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="bg-white rounded-2xl border border-[#E5E5E5] p-6 space-y-4">
            <h2 className="font-semibold text-[#171717]">Product Details</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-[#A3A3A3]">Price</span>
                <span className="font-bold text-[#E8436E]">₹{product.price}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#A3A3A3]">Status</span>
                <span className={`font-bold ${product.is_active ? 'text-green-500' : 'text-orange-500'}`}>
                  {product.is_active ? 'Active' : 'Draft'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#A3A3A3]">Stock</span>
                <span className={`font-bold ${isOutOfStock ? 'text-red-500' : 'text-[#171717]'}`}>
                  {isOutOfStock ? 'Out of Stock' : `${product.quantity} units`}
                </span>
              </div>
              {product.has_variants && product.variants && product.variants.length > 0 && (
                <div className="flex justify-between">
                  <span className="text-[#A3A3A3]">Variants</span>
                  <span className="font-medium text-[#525252]">{product.variants.length} sizes</span>
                </div>
              )}
              {product.accepts_custom_size && (
                <div className="flex justify-between">
                  <span className="text-[#A3A3A3]">Custom Size Price</span>
                  <span className="font-medium text-[#525252]">₹{product.custom_size_price}</span>
                </div>
              )}
            </div>
          </div>

          {product.description && (
            <div className="bg-white rounded-2xl border border-[#E5E5E5] p-6">
              <h2 className="font-semibold text-[#171717] mb-2">Description</h2>
              <p className="text-sm text-[#525252] leading-relaxed">{product.description}</p>
            </div>
          )}
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="space-y-4">
          <div className="bg-white rounded-2xl border border-[#E5E5E5] p-6">
            <h2 className="font-semibold text-[#171717] mb-4">Images</h2>
            <div className="grid grid-cols-2 gap-3">
              {(product.images && product.images.length > 0 ? product.images : product.image_url ? [product.image_url] : []).map((img, i) => (
                <div key={i} className="aspect-square rounded-xl bg-[#F5F5F5] overflow-hidden border border-[#E5E5E5]">
                  <img src={typeof img === 'string' ? img : img.image_url} alt="" className="w-full h-full object-cover" />
                </div>
              ))}
              {!product.image_url && (!product.images || product.images.length === 0) && (
                <div className="col-span-2 flex items-center justify-center py-12 text-[#A3A3A3]">
                  <Package className="w-12 h-12 opacity-50" />
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[#E5E5E5] p-6">
            <h2 className="font-semibold text-[#171717] mb-4 flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-[#E8436E]" />
              Sell Product
            </h2>
            {isOutOfStock ? (
              <p className="text-sm text-red-500 font-medium">Cannot sell — out of stock.</p>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setSellQty(q => Math.max(1, q - 1))}
                    className="p-2 rounded-lg bg-[#F5F5F5] hover:bg-[#E5E5E5] transition-colors"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="text-lg font-bold w-8 text-center">{sellQty}</span>
                  <button
                    onClick={() => setSellQty(q => Math.min(product.quantity, q + 1))}
                    className="p-2 rounded-lg bg-[#F5F5F5] hover:bg-[#E5E5E5] transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleSell}
                    disabled={selling}
                    className="flex-1 gradient-primary text-white font-semibold py-2.5 px-5 rounded-xl transition-all hover:shadow-lg hover:shadow-[#E8436E]/25 flex items-center justify-center gap-2"
                  >
                    {selling ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                      <>
                        <ShoppingCart className="w-4 h-4" />
                        Sell
                      </>
                    )}
                  </button>
                </div>
                <p className="text-xs text-[#A3A3A3]">
                  Decrements stock by {sellQty} (remaining: {product.quantity - sellQty})
                </p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
