"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2, Upload, X } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import { adminApi, apiClient, type Category, type ModelType } from "@/src/lib/api";

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [categories, setCategories] = useState<Category[]>([]);
  const [modelTypes, setModelTypes] = useState<ModelType[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    product_name: "", description: "", price: "", quantity: "0",
    category_id: "", unique_code: "", is_active: "true",
  });
  const [selectedModelType, setSelectedModelType] = useState("");
  const [hasVariants, setHasVariants] = useState(false);
  const [variants, setVariants] = useState<{ id: string; size: string; price: string; quantity: string }[]>([]);
  const [acceptsCustomSize, setAcceptsCustomSize] = useState(false);
  const [customSizePrice, setCustomSizePrice] = useState("");
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [newImageFiles, setNewImageFiles] = useState<File[]>([]);
  const [newImagePreviews, setNewImagePreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const nf: File[] = []; const np: string[] = [];
    for (let i = 0; i < files.length; i++) { nf.push(files[i]); np.push(URL.createObjectURL(files[i])); }
    setNewImageFiles(prev => [...prev, ...nf]);
    setNewImagePreviews(prev => [...prev, ...np]);
  };

  const removeExistingImage = (index: number) => setExistingImages(prev => prev.filter((_, i) => i !== index));

  useEffect(() => {
    Promise.all([adminApi.getProductById(id), adminApi.getCategories(), adminApi.getModelTypes()])
      .then(([product, cats, mts]) => {
        setCategories(cats);
        setModelTypes(mts);
        if (product) {
          setForm({
            product_name: product.product_name || "",
            description: product.description || "",
            price: String(product.price || ""),
            quantity: String(product.quantity || "0"),
            category_id: product.category_id || "",
            unique_code: product.unique_code || "",
            is_active: product.is_active !== false ? "true" : "false",
          });
          const cat = cats.find(c => c.id === product.category_id);
          if (cat) setSelectedModelType(cat.model_type_id || "");
          if (product.images?.length) setExistingImages(product.images);
          else if (product.image_url) setExistingImages([product.image_url]);
          if (product.variants?.length) {
            setHasVariants(true);
            setVariants(product.variants.map((v: any) => ({
              id: v.id || `v-${Math.random()}`,
              size: v.size, price: String(v.price), quantity: String(v.quantity),
            })));
          }
          if (product.accepts_custom_size) {
            setAcceptsCustomSize(true);
            setCustomSizePrice(String(product.custom_size_price || ""));
          }
        }
      })
      .catch(() => toast.error("Failed to load product"))
      .finally(() => setLoading(false));
  }, [id]);

  const filteredCategories = useMemo(() => {
    if (!selectedModelType) return [];
    return categories.filter(c => c.model_type_id === selectedModelType);
  }, [categories, selectedModelType]);

  const currentCategory = useMemo(() => categories.find(c => c.id === form.category_id), [categories, form.category_id]);

  const updateVariant = (vid: string, field: "price" | "quantity", value: string) => {
    setVariants(prev => prev.map(v => v.id === vid ? { ...v, [field]: value } : v));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("product_name", form.product_name);
      fd.append("price", String(parseFloat(form.price)));
      fd.append("description", form.description);
      fd.append("category_id", form.category_id);
      fd.append("quantity", String(parseInt(form.quantity) || 0));
      fd.append("unique_code", form.unique_code);
      fd.append("is_active", form.is_active);
      fd.append("has_variants", String(hasVariants));
      fd.append("accepts_custom_size", String(acceptsCustomSize));
      if (variants.length > 0) {
        fd.append("variants", JSON.stringify(variants.map(v => ({
          id: v.id, size: v.size, price: parseFloat(v.price) || 0, quantity: parseInt(v.quantity) || 0,
        }))));
      }
      if (acceptsCustomSize) fd.append("custom_size_price", String(parseFloat(customSizePrice) || parseFloat(form.price)));
      existingImages.forEach(url => fd.append("existing_images", url));
      if (existingImages.length === 0) fd.append("existing_images", "");
      newImageFiles.forEach(file => fd.append("images", file));
      await apiClient.put(`/products/${id}`, fd, { headers: { "Content-Type": "multipart/form-data" } });
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
        {/* Images */}
        <div>
          <label className="block text-sm font-medium text-[#525252] mb-1">Product Images</label>
          <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImageSelect} />
          <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-[#E5E5E5] rounded-xl p-8 text-center hover:border-[#E8436E] transition-colors cursor-pointer">
            <Upload className="w-8 h-8 mx-auto mb-2 text-[#A3A3A3]" />
            <p className="text-sm text-[#A3A3A3]">Drop new images here or click to upload</p>
          </div>
          {(existingImages.length > 0 || newImagePreviews.length > 0) && (
            <div className="flex gap-2 mt-3 flex-wrap">
              {existingImages.map((url, i) => (
                <div key={`e-${i}`} className="w-16 h-16 rounded-lg overflow-hidden border border-[#E5E5E5] relative group">
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  <button type="button" onClick={() => removeExistingImage(i)} className="absolute top-0 right-0 bg-black/50 rounded-bl-lg p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-3 h-3 text-white" /></button>
                </div>
              ))}
              {newImagePreviews.map((img, i) => (
                <div key={`n-${i}`} className="w-16 h-16 rounded-lg overflow-hidden border border-[#E5E5E5]"><img src={img} alt="" className="w-full h-full object-cover" /></div>
              ))}
            </div>
          )}
        </div>

        {/* Basic Info */}
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-[#525252] mb-1">Product Name *</label>
            <input value={form.product_name} onChange={e => setForm(f => ({ ...f, product_name: e.target.value }))} className="w-full px-4 py-2.5 border border-[#E5E5E5] rounded-xl outline-none focus:border-[#E8436E]" />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-[#525252] mb-1">Description</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} className="w-full px-4 py-2.5 border border-[#E5E5E5] rounded-xl outline-none focus:border-[#E8436E]" />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#525252] mb-1">Price (₹) *</label>
            <input type="number" step="0.01" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} className="w-full px-4 py-2.5 border border-[#E5E5E5] rounded-xl outline-none focus:border-[#E8436E]" />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#525252] mb-1">Unique Code</label>
            <input value={form.unique_code} onChange={e => setForm(f => ({ ...f, unique_code: e.target.value }))} className="w-full px-4 py-2.5 border border-[#E5E5E5] rounded-xl outline-none focus:border-[#E8436E]" />
          </div>
        </div>

        {/* Model Type */}
        <div>
          <label className="block text-sm font-medium text-[#525252] mb-2">Model Type</label>
          <div className="flex gap-2 flex-wrap">
            {modelTypes.map(mt => (
              <button type="button" key={mt.id}
                onClick={() => { setSelectedModelType(mt.id); setForm(f => ({ ...f, category_id: "" })); }}
                className={`px-4 py-2 rounded-full text-sm font-semibold border transition-colors ${selectedModelType === mt.id ? "bg-[#E8436E] text-white border-[#E8436E]" : "bg-white text-[#525252] border-[#E5E5E5] hover:border-[#E8436E]"}`}
              >
                {mt.name}
              </button>
            ))}
          </div>
        </div>

        {/* Category */}
        {selectedModelType && (
          <div>
            <label className="block text-sm font-medium text-[#525252] mb-2">Category *</label>
            <select value={form.category_id} onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))} className="w-full px-4 py-2.5 border border-[#E5E5E5] rounded-xl outline-none focus:border-[#E8436E] bg-white">
              <option value="">Select category</option>
              {filteredCategories.map(c => (
                <option key={c.id} value={c.id}>{c.category_name} {c.size_type && c.size_type !== "none" ? `(${c.size_type})` : ""}</option>
              ))}
            </select>
          </div>
        )}

        {/* Quantity / Variants */}
        {!hasVariants && (
          <div>
            <label className="block text-sm font-medium text-[#525252] mb-1">Total Quantity</label>
            <input type="number" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} className="w-full px-4 py-2.5 border border-[#E5E5E5] rounded-xl outline-none focus:border-[#E8436E]" />
          </div>
        )}

        {hasVariants && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-[#525252]">Size Variants</label>
              {currentCategory && <span className="text-xs text-[#A3A3A3]">from: {currentCategory.category_name}</span>}
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
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-semibold text-[#E8436E]">Custom Measurements</span>
            </div>
            <p className="text-xs text-[#737373] mb-3">Fields: {currentCategory.custom_measurement_fields?.join(", ") || "custom"}</p>
            <label className="block text-sm font-medium text-[#525252] mb-1">Custom Size Price (₹)</label>
            <input type="number" step="0.01" value={customSizePrice} onChange={e => setCustomSizePrice(e.target.value)} className="w-full px-4 py-2.5 border border-[#E5E5E5] rounded-xl outline-none focus:border-[#E8436E]" />
          </div>
        )}

        {/* Active Toggle */}
        <div className="flex items-center gap-3 pt-2">
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" checked={form.is_active === "true"} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked ? "true" : "false" }))} className="sr-only peer" />
            <div className="w-11 h-6 bg-[#E5E5E5] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#E8436E]"></div>
          </label>
          <span className="text-sm font-medium text-[#525252]">Product is active (visible to customers)</span>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Link href="/dashboard/products" className="px-5 py-2.5 text-sm font-medium text-[#525252] border border-[#E5E5E5] rounded-xl hover:bg-[#F5F5F5]">Cancel</Link>
          <button type="submit" disabled={saving} className="gradient-primary text-white font-semibold py-2.5 px-6 rounded-xl flex items-center gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {saving ? "Saving..." : "Update Product"}
          </button>
        </div>
      </motion.form>
    </div>
  );
}
