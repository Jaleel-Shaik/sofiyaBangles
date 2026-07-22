"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import { adminApi, type Product, type Category } from "@/src/lib/api";

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    product_name: "", description: "", price: "", quantity: "", category_id: "", unique_code: "",
  });

  useEffect(() => {
    Promise.all([
      adminApi.getProductById(id),
      adminApi.getCategories(),
    ]).then(([product, cats]) => {
      if (product) {
        setForm({
          product_name: product.product_name || "",
          description: product.description || "",
          price: String(product.price || ""),
          quantity: String(product.quantity || ""),
          category_id: product.category_id || "",
          unique_code: product.unique_code || "",
        });
      }
      setCategories(cats);
    }).catch(() => toast.error("Failed to load product")).finally(() => setLoading(false));
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await adminApi.updateProduct(id, {
        ...form,
        price: parseFloat(form.price) || 0,
        quantity: parseInt(form.quantity) || 0,
      });
      toast.success("Product updated");
      router.push("/dashboard/products");
    } catch (e: any) {
      toast.error(e.message || "Failed to update");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-[#E8436E]" /></div>;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/products" className="p-2 rounded-xl hover:bg-[#F5F5F5]"><ArrowLeft className="w-5 h-5" /></Link>
        <div><h1 className="text-2xl font-bold text-[#171717]">Edit Product</h1><p className="text-[#737373] text-sm">Update product details</p></div>
      </div>
      <motion.form initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} onSubmit={handleSubmit} className="bg-white rounded-2xl border border-[#E5E5E5] p-6 space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-[#525252] mb-1">Product Name</label>
            <input value={form.product_name} onChange={e => setForm(f => ({ ...f, product_name: e.target.value }))} className="w-full px-4 py-2.5 border border-[#E5E5E5] rounded-xl outline-none focus:border-[#E8436E]" />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-[#525252] mb-1">Description</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} className="w-full px-4 py-2.5 border border-[#E5E5E5] rounded-xl outline-none focus:border-[#E8436E]" />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#525252] mb-1">Price (₹)</label>
            <input type="number" step="0.01" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} className="w-full px-4 py-2.5 border border-[#E5E5E5] rounded-xl outline-none focus:border-[#E8436E]" />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#525252] mb-1">Quantity</label>
            <input type="number" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} className="w-full px-4 py-2.5 border border-[#E5E5E5] rounded-xl outline-none focus:border-[#E8436E]" />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#525252] mb-1">Unique Code</label>
            <input value={form.unique_code} onChange={e => setForm(f => ({ ...f, unique_code: e.target.value }))} className="w-full px-4 py-2.5 border border-[#E5E5E5] rounded-xl outline-none focus:border-[#E8436E]" />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#525252] mb-1">Category</label>
            <select value={form.category_id} onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))} className="w-full px-4 py-2.5 border border-[#E5E5E5] rounded-xl outline-none focus:border-[#E8436E] bg-white">
              <option value="">Select category</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.category_name}</option>)}
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Link href="/dashboard/products" className="px-5 py-2.5 text-sm font-medium text-[#525252] border border-[#E5E5E5] rounded-xl hover:bg-[#F5F5F5]">Cancel</Link>
          <button type="submit" disabled={saving} className="gradient-primary text-white font-semibold py-2.5 px-6 rounded-xl">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Update Product"}
          </button>
        </div>
      </motion.form>
    </div>
  );
}
