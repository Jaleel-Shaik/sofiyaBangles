"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2, Upload } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import { adminApi, type Category } from "@/src/lib/api";

export default function AddProductPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    product_name: "",
    description: "",
    price: "",
    quantity: "",
    category_id: "",
    unique_code: "",
  });
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const newFiles: File[] = [];
    const newPreviews: string[] = [];
    for (let i = 0; i < files.length; i++) {
      newFiles.push(files[i]);
      newPreviews.push(URL.createObjectURL(files[i]));
    }
    setImageFiles(prev => [...prev, ...newFiles]);
    setImagePreviews(prev => [...prev, ...newPreviews]);
  };

  useEffect(() => {
    adminApi.getCategories().then(setCategories).catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.product_name.trim() || !form.price) {
      toast.error("Product name and price are required");
      return;
    }
    setSaving(true);
    try {
      const formData = new FormData();
      Object.entries(form).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== "") {
          if (key === "price") formData.append(key, String(parseFloat(form.price)));
          else if (key === "quantity") formData.append(key, String(parseInt(form.quantity) || 0));
          else formData.append(key, String(val));
        }
      });
      imageFiles.forEach(file => formData.append('images', file));
      await adminApi.createProductDirect(formData);
      toast.success("Product created");
      router.push("/dashboard/products");
    } catch (e: any) {
      toast.error(e.message || "Failed to create product");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/products" className="p-2 rounded-xl hover:bg-[#F5F5F5]">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-[#171717]">Add Product</h1>
          <p className="text-[#737373] text-sm">Create a new product listing</p>
        </div>
      </div>

      <motion.form initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} onSubmit={handleSubmit} className="bg-white rounded-2xl border border-[#E5E5E5] p-6 space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-[#525252] mb-1">Product Name *</label>
            <input value={form.product_name} onChange={e => setForm(f => ({ ...f, product_name: e.target.value }))} className="w-full px-4 py-2.5 border border-[#E5E5E5] rounded-xl outline-none focus:border-[#E8436E]" placeholder="Gold Bangles Set" />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-[#525252] mb-1">Description</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} className="w-full px-4 py-2.5 border border-[#E5E5E5] rounded-xl outline-none focus:border-[#E8436E]" placeholder="Product description..." />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#525252] mb-1">Price (₹) *</label>
            <input type="number" step="0.01" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} className="w-full px-4 py-2.5 border border-[#E5E5E5] rounded-xl outline-none focus:border-[#E8436E]" placeholder="999" />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#525252] mb-1">Quantity</label>
            <input type="number" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} className="w-full px-4 py-2.5 border border-[#E5E5E5] rounded-xl outline-none focus:border-[#E8436E]" placeholder="10" />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#525252] mb-1">Unique Code</label>
            <input value={form.unique_code} onChange={e => setForm(f => ({ ...f, unique_code: e.target.value }))} className="w-full px-4 py-2.5 border border-[#E5E5E5] rounded-xl outline-none focus:border-[#E8436E]" placeholder="BGL-001" />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#525252] mb-1">Category</label>
            <select value={form.category_id} onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))} className="w-full px-4 py-2.5 border border-[#E5E5E5] rounded-xl outline-none focus:border-[#E8436E] bg-white">
              <option value="">Select category</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.category_name}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-[#525252] mb-1">Product Images</label>
          <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImageSelect} />
          <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-[#E5E5E5] rounded-xl p-8 text-center hover:border-[#E8436E] transition-colors cursor-pointer">
            <Upload className="w-8 h-8 mx-auto mb-2 text-[#A3A3A3]" />
            <p className="text-sm text-[#A3A3A3]">{imagePreviews.length > 0 ? `${imagePreviews.length} image(s) selected` : 'Drop images here or click to upload'}</p>
          </div>
          {imagePreviews.length > 0 && (
            <div className="flex gap-2 mt-3 flex-wrap">
              {imagePreviews.map((img, i) => (
                <div key={i} className="w-16 h-16 rounded-lg overflow-hidden border border-[#E5E5E5]">
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Link href="/dashboard/products" className="px-5 py-2.5 text-sm font-medium text-[#525252] border border-[#E5E5E5] rounded-xl hover:bg-[#F5F5F5]">Cancel</Link>
          <button type="submit" disabled={saving} className="gradient-primary text-white font-semibold py-2.5 px-6 rounded-xl flex items-center gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {saving ? "Creating..." : "Create Product"}
          </button>
        </div>
      </motion.form>
    </div>
  );
}
