"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2, Upload, Plus, Minus, X } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import { adminApi, type Category, type ModelType } from "@/src/lib/api";

export default function AddProductPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [modelTypes, setModelTypes] = useState<ModelType[]>([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    product_name: "",
    description: "",
    price: "",
    quantity: "10",
    category_id: "",
    unique_code: "",
    is_active: "true",
  });
  const [selectedModelType, setSelectedModelType] = useState("");
  const [hasVariants, setHasVariants] = useState(false);
  const [variants, setVariants] = useState<{ id: string; size: string; price: string; quantity: string }[]>([]);
  const [acceptsCustomSize, setAcceptsCustomSize] = useState(false);
  const [customSizePrice, setCustomSizePrice] = useState("");
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    Promise.all([adminApi.getCategories(), adminApi.getModelTypes()])
      .then(([cats, mts]) => { setCategories(cats); setModelTypes(mts); })
      .catch(() => {});
  }, []);

  const filteredCategories = useMemo(() => {
    if (!selectedModelType) return [];
    return categories.filter(c => c.model_type_id === selectedModelType);
  }, [categories, selectedModelType]);

  const currentCategory = useMemo(() => categories.find(c => c.id === form.category_id), [categories, form.category_id]);

  useEffect(() => {
    setForm(f => ({ ...f, category_id: "" }));
  }, [selectedModelType]);

  useEffect(() => {
    setHasVariants(false);
    setAcceptsCustomSize(false);
    setVariants([]);
    if (currentCategory) {
      if (currentCategory.size_type === "standard" || currentCategory.size_type === "both") {
        setHasVariants(true);
        if (currentCategory.standard_sizes) {
          setVariants(currentCategory.standard_sizes.map(sz => ({
            id: `v-${Math.random().toString(36).substr(2, 9)}`,
            size: sz,
            price: form.price || "0",
            quantity: form.quantity || "0",
          })));
        }
      }
      if (currentCategory.size_type === "custom" || currentCategory.size_type === "both") {
        setAcceptsCustomSize(true);
        setCustomSizePrice(form.price);
      }
    }
  }, [currentCategory, form.price, form.quantity]);

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

  const removeImage = (index: number) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const updateVariant = (id: string, field: "price" | "quantity", value: string) => {
    setVariants(prev => prev.map(v => v.id === id ? { ...v, [field]: value } : v));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.product_name.trim() || !form.price || !form.category_id) {
      toast.error("Product name, price, and category are required");
      return;
    }
    if (imageFiles.length === 0) {
      toast.error("Please select at least one image");
      return;
    }
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append("product_name", form.product_name);
      formData.append("price", String(parseFloat(form.price)));
      formData.append("description", form.description);
      formData.append("category_id", form.category_id);
      formData.append("quantity", String(parseInt(form.quantity) || 0));
      formData.append("is_active", form.is_active);
      if (form.unique_code) formData.append("unique_code", form.unique_code);
      formData.append("has_variants", String(hasVariants));
      formData.append("accepts_custom_size", String(acceptsCustomSize));
      if (variants.length > 0) {
        formData.append("variants", JSON.stringify(variants.map(v => ({
          id: v.id, size: v.size, price: parseFloat(v.price) || 0, quantity: parseInt(v.quantity) || 0,
        }))));
      }
      if (acceptsCustomSize) formData.append("custom_size_price", String(parseFloat(customSizePrice) || parseFloat(form.price)));
      imageFiles.forEach(file => formData.append("images", file));
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
        {/* Images */}
        <div>
          <label className="block text-sm font-medium text-[#525252] mb-1">Product Images *</label>
          <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImageSelect} />
          <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-[#E5E5E5] rounded-xl p-8 text-center hover:border-[#E8436E] transition-colors cursor-pointer">
            <Upload className="w-8 h-8 mx-auto mb-2 text-[#A3A3A3]" />
            <p className="text-sm text-[#A3A3A3]">{imagePreviews.length > 0 ? `${imagePreviews.length} image(s) selected` : "Drop images here or click to upload"}</p>
          </div>
          {imagePreviews.length > 0 && (
            <div className="flex gap-2 mt-3 flex-wrap">
              {imagePreviews.map((img, i) => (
                <div key={i} className="w-16 h-16 rounded-lg overflow-hidden border border-[#E5E5E5] relative group">
                  <img src={img} alt="" className="w-full h-full object-cover" />
                  <button type="button" onClick={() => removeImage(i)} className="absolute top-0 right-0 bg-black/50 rounded-bl-lg p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <X className="w-3 h-3 text-white" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Basic Info */}
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
            <label className="block text-sm font-medium text-[#525252] mb-1">Base Price (₹) *</label>
            <input type="number" step="0.01" value={form.price} onChange={e => {
              setForm(f => ({ ...f, price: e.target.value }));
              setCustomSizePrice(e.target.value);
            }} className="w-full px-4 py-2.5 border border-[#E5E5E5] rounded-xl outline-none focus:border-[#E8436E]" placeholder="999" />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#525252] mb-1">Unique Code</label>
            <input value={form.unique_code} onChange={e => setForm(f => ({ ...f, unique_code: e.target.value }))} className="w-full px-4 py-2.5 border border-[#E5E5E5] rounded-xl outline-none focus:border-[#E8436E]" placeholder="Auto-generated if empty" />
          </div>
        </div>

        {/* Model Type Selection */}
        <div>
          <label className="block text-sm font-medium text-[#525252] mb-2">Model Type *</label>
          <div className="flex gap-2 flex-wrap">
            {modelTypes.map(mt => (
              <button type="button" key={mt.id}
                onClick={() => setSelectedModelType(mt.id)}
                className={`px-4 py-2 rounded-full text-sm font-semibold border transition-colors ${selectedModelType === mt.id ? "bg-[#E8436E] text-white border-[#E8436E]" : "bg-white text-[#525252] border-[#E5E5E5] hover:border-[#E8436E]"}`}
              >
                {mt.name}
              </button>
            ))}
          </div>
        </div>

        {/* Category Selection */}
        {selectedModelType && (
          <div>
            <label className="block text-sm font-medium text-[#525252] mb-2">Category *</label>
            <select value={form.category_id} onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))} className="w-full px-4 py-2.5 border border-[#E5E5E5] rounded-xl outline-none focus:border-[#E8436E] bg-white">
              <option value="">Select category</option>
              {filteredCategories.map(c => (
                <option key={c.id} value={c.id}>
                  {c.category_name} {c.size_type && c.size_type !== "none" ? `(${c.size_type} sizing)` : ""}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Quantity / Variants */}
        {form.category_id && currentCategory && !hasVariants && (
          <div>
            <label className="block text-sm font-medium text-[#525252] mb-1">Total Quantity</label>
            <input type="number" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} className="w-full px-4 py-2.5 border border-[#E5E5E5] rounded-xl outline-none focus:border-[#E8436E]" placeholder="10" />
          </div>
        )}

        {hasVariants && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-[#525252]">Size Variants</label>
              {currentCategory && <span className="text-xs text-[#A3A3A3]">Sizes from: {currentCategory.category_name}</span>}
            </div>
            <div className="space-y-2">
              {variants.map(v => (
                <div key={v.id} className="flex items-center gap-3 bg-[#FAFAFA] p-3 rounded-xl border border-[#E5E5E5]">
                  <div className="bg-[#E8436E] text-white font-bold px-3 py-1.5 rounded-lg text-sm min-w-[48px] text-center">{v.size}</div>
                  <div className="flex-1">
                    <label className="text-[10px] text-[#A3A3A3] font-semibold uppercase">Price (₹)</label>
                    <input type="number" value={v.price} onChange={e => updateVariant(v.id, "price", e.target.value)} className="w-full px-3 py-1.5 border border-[#E5E5E5] rounded-lg outline-none focus:border-[#E8436E] text-sm" />
                  </div>
                  <div className="w-24">
                    <label className="text-[10px] text-[#A3A3A3] font-semibold uppercase">Qty</label>
                    <input type="number" value={v.quantity} onChange={e => updateVariant(v.id, "quantity", e.target.value)} className="w-full px-3 py-1.5 border border-[#E5E5E5] rounded-lg outline-none focus:border-[#E8436E] text-sm" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Custom Size */}
        {acceptsCustomSize && currentCategory && (
          <div className="bg-[#FFF0F3] p-4 rounded-xl border border-[#E8436E]/20">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-semibold text-[#E8436E]">Custom Measurements</span>
            </div>
            <p className="text-xs text-[#737373] mb-3">Customers can enter their own measurements ({currentCategory.custom_measurement_fields?.join(", ") || "custom fields"}) when ordering.</p>
            <label className="block text-sm font-medium text-[#525252] mb-1">Custom Size Price (₹)</label>
            <input type="number" step="0.01" value={customSizePrice} onChange={e => setCustomSizePrice(e.target.value)} className="w-full px-4 py-2.5 border border-[#E5E5E5] rounded-xl outline-none focus:border-[#E8436E]" placeholder="e.g. 3000" />
          </div>
        )}

        {/* Publish Toggle */}
        <div className="flex items-center gap-3 pt-2">
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" checked={form.is_active === "true"} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked ? "true" : "false" }))} className="sr-only peer" />
            <div className="w-11 h-6 bg-[#E5E5E5] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#E8436E]"></div>
          </label>
          <span className="text-sm font-medium text-[#525252]">Publish product immediately</span>
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
