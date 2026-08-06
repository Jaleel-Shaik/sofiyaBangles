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
  const initialCategoryIdRef = useRef("");
  const currentCategory = useMemo(() => categories.find(c => c.id === form.category_id), [categories, form.category_id]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const nf: File[] = []; const np: string[] = [];
    for (let i = 0; i < files.length; i++) { nf.push(files[i]); np.push(URL.createObjectURL(files[i])); }
    setNewImageFiles(prev => [...prev, ...nf]);
    setNewImagePreviews(prev => [...prev, ...np]);
  };

  const removeExistingImage = (index: number) => setExistingImages(prev => prev.filter((_, i) => i !== index));
  const removeNewImage = (index: number) => {
    setNewImageFiles(prev => prev.filter((_, i) => i !== index));
    setNewImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  useEffect(() => {
    Promise.all([adminApi.getProductById(id), adminApi.getCategories(), adminApi.getModelTypes()])
      .then(([product, cats, mts]) => {
        setCategories(cats);
        setModelTypes(mts);
        if (product) {
          initialCategoryIdRef.current = product.category_id || "";
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

  useEffect(() => {
    if (!currentCategory) {
      setHasVariants(false);
      setVariants([]);
      setAcceptsCustomSize(false);
      return;
    }
    
    // Only update variants if category_id has actually changed from initial load
    if (form.category_id !== initialCategoryIdRef.current) {
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
      } else {
        setHasVariants(false);
        setVariants([]);
      }
      
      if (currentCategory.size_type === "custom" || currentCategory.size_type === "both") {
        setAcceptsCustomSize(true);
        setCustomSizePrice(form.price);
      } else {
        setAcceptsCustomSize(false);
      }
    }
  }, [form.category_id, currentCategory]);

  const filteredCategories = useMemo(() => {
    if (!selectedModelType) return [];
    return categories.filter(c => c.model_type_id === selectedModelType);
  }, [categories, selectedModelType]);



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
      <motion.form initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Images */}
        <div className="bg-white rounded-2xl border border-[#E5E5E5] p-6 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-[#F5F5F5]">
            <Upload className="w-5 h-5 text-[#E8436E]" />
            <h2 className="text-lg font-bold text-[#171717]">Product Images</h2>
          </div>
          <div>
            <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImageSelect} />
            <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-[#E5E5E5] rounded-xl p-8 text-center hover:border-[#E8436E] transition-colors cursor-pointer bg-[#FAFAFA]">
              <Upload className="w-8 h-8 mx-auto mb-2 text-[#A3A3A3]" />
              <p className="text-sm text-[#A3A3A3] font-medium">Drop new images here or click to upload</p>
            </div>
            {(existingImages.length > 0 || newImagePreviews.length > 0) && (
              <div className="flex gap-2 mt-4 flex-wrap">
                {existingImages.map((url, i) => (
                  <div key={`e-${i}`} className="w-20 h-20 rounded-xl overflow-hidden border border-[#E5E5E5] relative group shadow-sm">
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    <button type="button" onClick={() => removeExistingImage(i)} className="absolute top-1 right-1 bg-black/60 hover:bg-black/80 rounded-full p-1 transition-colors">
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </div>
                ))}
                {newImagePreviews.map((img, i) => (
                  <div key={`n-${i}`} className="w-20 h-20 rounded-xl overflow-hidden border border-[#E5E5E5] relative group shadow-sm">
                    <img src={img} alt="" className="w-full h-full object-cover" />
                    <button type="button" onClick={() => removeNewImage(i)} className="absolute top-1 right-1 bg-black/60 hover:bg-black/80 rounded-full p-1 transition-colors">
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Section 2: Basic Details */}
        <div className="bg-white rounded-2xl border border-[#E5E5E5] p-6 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-[#F5F5F5]">
            <svg className="w-5 h-5 text-[#E8436E]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h2 className="text-lg font-bold text-[#171717]">Basic Details</h2>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 md:col-span-1">
              <label className="block text-sm font-semibold text-[#525252] mb-1.5">Product Name *</label>
              <input value={form.product_name} onChange={e => setForm(f => ({ ...f, product_name: e.target.value }))} className="w-full px-4 py-2.5 border border-[#E5E5E5] rounded-xl outline-none focus:border-[#E8436E] transition-colors" />
            </div>
            <div className="col-span-2 md:col-span-1">
              <label className="block text-sm font-semibold text-[#525252] mb-1.5">Price (₹) *</label>
              <input type="number" step="0.01" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} className="w-full px-4 py-2.5 border border-[#E5E5E5] rounded-xl outline-none focus:border-[#E8436E] transition-colors" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-semibold text-[#525252] mb-1.5">Description</label>
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} className="w-full px-4 py-2.5 border border-[#E5E5E5] rounded-xl outline-none focus:border-[#E8436E] transition-colors" />
            </div>
          </div>
        </div>

        {/* Section 3: Categorization */}
        <div className="bg-white rounded-2xl border border-[#E5E5E5] p-6 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-[#F5F5F5]">
            <svg className="w-5 h-5 text-[#E8436E]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
            <h2 className="text-lg font-bold text-[#171717]">Categorization</h2>
          </div>
          <div>
            <label className="block text-sm font-semibold text-[#525252] mb-2">Model Type</label>
            <div className="flex gap-2 flex-wrap">
              {modelTypes.map(mt => (
                <button type="button" key={mt.id}
                  onClick={() => { setSelectedModelType(mt.id); setForm(f => ({ ...f, category_id: "" })); }}
                  className={`px-5 py-2.5 rounded-full text-sm font-bold border transition-all ${selectedModelType === mt.id ? "bg-[#E8436E] text-white border-[#E8436E] shadow-sm shadow-[#E8436E]/20" : "bg-white text-[#525252] border-[#E5E5E5] hover:border-[#E8436E]"}`}
                >
                  {mt.name}
                </button>
              ))}
            </div>
          </div>

          {selectedModelType && (
            <div className="space-y-3 pt-2">
              <label className="block text-sm font-semibold text-[#525252]">Select Category *</label>
              {filteredCategories.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {filteredCategories.map((c) => {
                    const isSelected = form.category_id === c.id;
                    return (
                      <button
                        type="button"
                        key={c.id}
                        onClick={(e) => {
                          e.preventDefault();
                          setForm(f => ({ ...f, category_id: f.category_id === c.id ? "" : c.id }));
                        }}
                        className={`flex items-center p-4 rounded-2xl border-2 cursor-pointer text-left w-full transition-all ${
                          isSelected
                            ? "bg-[#FFF0F3] border-[#E8436E] shadow-sm"
                            : "bg-white border-[#E5E5E5] hover:border-[#E8436E]"
                        }`}
                      >
                        <div className="w-16 h-16 rounded-xl bg-[#FAFAFA] mr-4 border border-[#E5E5E5] overflow-hidden flex-shrink-0">
                          {c.image_url ? (
                            <img src={c.image_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[#A3A3A3]">
                              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                              </svg>
                            </div>
                          )}
                        </div>
                        <div className="flex-grow min-w-0">
                          <h3 className={`font-bold truncate text-sm ${isSelected ? "text-[#E8436E]" : "text-[#171717]"}`}>
                            {c.category_name}
                          </h3>
                          {c.size_type && c.size_type !== "none" && (
                            <span className="inline-block mt-1.5 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-white border border-[#E5E5E5] text-[#737373] rounded-md">
                              {c.size_type} Sizing
                            </span>
                          )}
                        </div>
                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 transition-colors ${
                          isSelected ? "bg-[#E8436E] border-[#E8436E] text-white" : "border-[#D4D4D4] bg-white"
                        }`}>
                          {isSelected && (
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="border border-dashed border-[#E5E5E5] rounded-2xl p-6 text-center text-[#A3A3A3] text-sm">
                  No categories found for this model type.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Section 4: Inventory & Sizing */}
        <div className="bg-white rounded-2xl border border-[#E5E5E5] p-6 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-[#F5F5F5]">
            <svg className="w-5 h-5 text-[#E8436E]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <h2 className="text-lg font-bold text-[#171717]">Inventory & Sizing</h2>
          </div>

          {!hasVariants ? (
            <div>
              <label className="block text-sm font-semibold text-[#525252] mb-1.5">Total Quantity</label>
              <input type="number" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} className="w-full px-4 py-2.5 border border-[#E5E5E5] rounded-xl outline-none focus:border-[#E8436E]" />
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-[#525252]">Size Variants</label>
                <span className="text-xs text-[#A3A3A3]">Sizes defined by category</span>
              </div>
              <div className="space-y-3">
                {variants.map(v => (
                  <div key={v.id} className="flex items-center gap-4 bg-[#FAFAFA] p-4 rounded-2xl border border-[#E5E5E5]">
                    <div className="bg-[#E8436E] text-white font-black px-4 py-2.5 rounded-xl text-lg min-w-[56px] text-center shadow-sm shadow-[#E8436E]/20">{v.size}</div>
                    <div className="flex-grow">
                      <label className="block text-[10px] text-[#A3A3A3] font-bold uppercase tracking-wider mb-1 ml-0.5">Price (₹)</label>
                      <input type="number" value={v.price} onChange={e => updateVariant(v.id, "price", e.target.value)} className="w-full px-3 py-2 border border-[#E5E5E5] rounded-xl outline-none focus:border-[#E8436E] text-sm bg-white font-medium" />
                    </div>
                    <div className="w-28">
                      <label className="block text-[10px] text-[#A3A3A3] font-bold uppercase tracking-wider mb-1 ml-0.5">Stock</label>
                      <input type="number" value={v.quantity} onChange={e => updateVariant(v.id, "quantity", e.target.value)} className="w-full px-3 py-2 border border-[#E5E5E5] rounded-xl outline-none focus:border-[#E8436E] text-sm bg-white font-medium" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Custom Sizing Notice & Price */}
          {acceptsCustomSize && currentCategory && (
            <div className="bg-[#FFF0F3] p-5 rounded-2xl border border-[#E8436E]/10 space-y-3 mt-4">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-[#E8436E]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.121 14.121L19 19m-7-7h7m-7-6a2 2 0 11-4 0 2 2 0 014 0zM9 11a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span className="text-sm font-bold text-[#E8436E]">Custom Measurements Sizing</span>
              </div>
              <p className="text-xs text-[#737373] leading-relaxed">
                Fields: {currentCategory.custom_measurement_fields?.join(", ") || "custom"}
              </p>
              <div>
                <label className="block text-xs font-bold text-[#525252] uppercase tracking-wider mb-1">Custom Size Price (₹)</label>
                <input type="number" step="0.01" value={customSizePrice} onChange={e => setCustomSizePrice(e.target.value)} className="w-full px-4 py-2.5 border border-[#E5E5E5] rounded-xl outline-none focus:border-[#E8436E] bg-white text-sm" />
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Link href="/dashboard/products" className="px-6 py-3 text-sm font-semibold text-[#525252] border border-[#E5E5E5] rounded-xl hover:bg-[#F5F5F5] transition-colors">Cancel</Link>
          <button type="submit" disabled={saving} className="gradient-primary text-white font-bold py-3 px-8 rounded-xl flex items-center gap-2 shadow-lg shadow-[#E8436E]/20 transition-transform active:scale-[0.98] disabled:opacity-60">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {saving ? "Saving..." : "Update Product"}
          </button>
        </div>
      </motion.form>
    </div>
  );
}
