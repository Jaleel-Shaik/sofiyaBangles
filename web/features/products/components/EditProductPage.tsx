"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import { type Category, type ModelType } from "@/src/lib/api";

import { EditProductImageUpload } from "./form/EditProductImageUpload";
import { ProductBasicInfo } from "./form/ProductBasicInfo";
import { ProductCategorySelect } from "./form/ProductCategorySelect";
import { ProductVariants } from "./form/ProductVariants";
import { FormState, VariantState } from "./form/types";
import { api } from "@/src/lib/api";

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [categories, setCategories] = useState<Category[]>([]);
  const [modelTypes, setModelTypes] = useState<ModelType[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [form, setForm] = useState<FormState>({
    product_name: "",
    description: "",
    price: "",
    quantity: "0",
    category_id: "",
    unique_code: "",
    status: "active",
  });

  const [selectedModelType, setSelectedModelType] = useState("");
  const [hasVariants, setHasVariants] = useState(false);
  const [variants, setVariants] = useState<VariantState[]>([]);
  const [acceptsCustomSize, setAcceptsCustomSize] = useState(false);
  const [customSizePrice, setCustomSizePrice] = useState("");
  const [customSizeName, setCustomSizeName] = useState("");
  
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [newImageFiles, setNewImageFiles] = useState<File[]>([]);
  const [newImagePreviews, setNewImagePreviews] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const initialCategoryIdRef = useRef("");

  useEffect(() => {
    Promise.all([api.admin.getProductById(id), api.admin.getModelTypes()])
      .then(([product, mts]) => {
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
            status: product.status || (product.is_active !== false ? "active" : "draft"),
          });
          setSelectedModelType(product.model_type_id || "");
          if (product.images?.length) setExistingImages(product.images.map((img) => typeof img === 'string' ? img : img.image_url));
          else if (product.image_url) setExistingImages([product.image_url]);
          if (product.variants?.length) {
            setHasVariants(true);
            setVariants(product.variants.map((v, idx) => ({
              id: v.id || `v-${idx}-${v.size || ""}`,
              size: v.size || "", price: String(v.price ?? ""), quantity: String(v.quantity ?? v.stock_quantity ?? "0"),
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
    if (selectedModelType) {
      api.admin.getCategories(selectedModelType)
        .then(cats => setCategories(cats))
        .catch(() => setCategories([]));
    } else {
      setCategories([]);
    }
  }, [selectedModelType]);

  const filteredCategories = categories;
  const currentCategory = useMemo(() => categories.find(c => c.id === form.category_id), [categories, form.category_id]);

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
            id: `v-${sz.replace(/\s+/g, "_")}`,
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
  }, [form.category_id, currentCategory, form.price]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;

    const newErrors: Record<string, string> = {};
    if (!form.product_name.trim()) newErrors.product_name = "Product name is required";
    if (!form.price) newErrors.price = "Price is required";
    else if (parseFloat(form.price) <= 0) newErrors.price = "Price must be a positive number";
    if (!selectedModelType) newErrors.model_type_id = "Model Type is required";
    if (!form.category_id) newErrors.category_id = "Category is required";
    if (existingImages.length === 0 && newImageFiles.length === 0) newErrors.images = "Please select at least one image";

    if (hasVariants && variants.length === 0) {
      newErrors.variants = "Please add at least one size variant or disable sizes";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      const firstError = Object.values(newErrors)[0];
      toast.error(firstError);
      return;
    }

    setErrors({});
    setSaving(true);

    try {
      const formData = new FormData();
      formData.append("product_name", form.product_name);
      formData.append("price", String(parseFloat(form.price)));
      formData.append("description", form.description);
      formData.append("category_id", form.category_id);
      if (selectedModelType) formData.append("model_type_id", selectedModelType);
      
      const totalQuantity = hasVariants 
        ? variants.reduce((sum, v) => sum + (parseInt(v.quantity) || 0), 0)
        : (parseInt(form.quantity) || 0);

      formData.append("quantity", String(totalQuantity));
      formData.append("status", form.status);
      formData.append("is_active", form.status === "active" || form.status === "out_of_stock" ? "true" : "false");
      if (form.unique_code) formData.append("unique_code", form.unique_code);
      formData.append("has_variants", String(hasVariants));
      formData.append("accepts_custom_size", String(acceptsCustomSize));
      
      if (hasVariants && variants.length > 0) {
        formData.append("variants", JSON.stringify(variants.map(v => ({
          id: v.id, size: v.size, price: parseFloat(v.price) || parseFloat(form.price) || 0, quantity: parseInt(v.quantity) || 0,
        }))));
      }
      
      if (acceptsCustomSize) {
        formData.append("custom_size_price", String(parseFloat(customSizePrice) || parseFloat(form.price)));
      }
      
      if (existingImages.length > 0) formData.append("existing_images", JSON.stringify(existingImages));
      newImageFiles.forEach(file => formData.append("images", file));
      
      await api.admin.updateProductDirect(id, formData);
      toast.success("Product updated");
      router.push("/dashboard/products");
    } catch (e: any) {
      toast.error(e.message || "Failed to update product");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-[#E8436E] mb-4" />
        <p className="text-[#737373] text-sm font-medium animate-pulse">Loading product details...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/products" className="p-2 rounded-xl hover:bg-[#F5F5F5]">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-[#171717]">Edit Product</h1>
          <p className="text-[#737373] text-sm">Update product details and inventory</p>
        </div>
      </div>

      <motion.form initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} onSubmit={handleSubmit} className="space-y-6">
        
        <EditProductImageUpload
          existingImages={existingImages}
          setExistingImages={setExistingImages}
          newImageFiles={newImageFiles}
          setNewImageFiles={setNewImageFiles}
          newImagePreviews={newImagePreviews}
          setNewImagePreviews={setNewImagePreviews}
          errors={errors}
          setErrors={setErrors}
        />

        <ProductBasicInfo
          form={form}
          setForm={setForm}
          errors={errors}
          setErrors={setErrors}
          setCustomSizePrice={setCustomSizePrice}
        />

        <ProductCategorySelect
          modelTypes={modelTypes}
          selectedModelType={selectedModelType}
          setSelectedModelType={setSelectedModelType}
          filteredCategories={filteredCategories}
          form={form}
          setForm={setForm}
          errors={errors}
          setErrors={setErrors}
        />

        <ProductVariants
          form={form}
          setForm={setForm}
          hasVariants={hasVariants}
          setHasVariants={setHasVariants}
          variants={variants}
          setVariants={setVariants}
          currentCategory={currentCategory}
          customSizeName={customSizeName}
          setCustomSizeName={setCustomSizeName}
          acceptsCustomSize={acceptsCustomSize}
          setAcceptsCustomSize={setAcceptsCustomSize}
          customSizePrice={customSizePrice}
          setCustomSizePrice={setCustomSizePrice}
          errors={errors}
        />

        <div className="flex justify-end gap-3 pt-2">
          <Link href="/dashboard/products" className="px-6 py-3 text-sm font-semibold text-[#525252] border border-[#E5E5E5] rounded-xl hover:bg-[#F5F5F5] transition-colors cursor-pointer">Cancel</Link>
          <button type="submit" disabled={saving} className="gradient-primary text-white font-bold py-3 px-8 rounded-xl flex items-center gap-2 shadow-lg shadow-[#E8436E]/20 transition-transform active:scale-[0.98] disabled:opacity-60 disabled:pointer-events-none disabled:cursor-not-allowed cursor-pointer">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {saving ? "Updating Product..." : "Save Changes"}
          </button>
        </div>
      </motion.form>
    </div>
  );
}
