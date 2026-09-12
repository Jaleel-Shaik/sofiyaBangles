"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import { type Category, type ModelType } from "@/src/lib/api";

import { ProductImageUpload } from "./form/ProductImageUpload";
import { ProductBasicInfo } from "./form/ProductBasicInfo";
import { ProductCategorySelect } from "./form/ProductCategorySelect";
import { ProductVariants } from "./form/ProductVariants";
import { FormState, VariantState } from "./form/types";
import { api } from "@/src/lib/api";

export default function AddProductPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [modelTypes, setModelTypes] = useState<ModelType[]>([]);
  const [saving, setSaving] = useState(false);
  
  const [form, setForm] = useState<FormState>({
    product_name: "",
    description: "",
    price: "",
    quantity: "10",
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
  
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    api.admin.getModelTypes()
      .then((mts) => {
        setModelTypes(mts);
        if (mts.length > 0 && !selectedModelType) {
          setSelectedModelType(mts[0].id);
        }
      })
      .catch(() => {});
  }, []);

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
    setForm(f => ({ ...f, category_id: "" }));
  }, [selectedModelType]);

  useEffect(() => {
    if (currentCategory) {
      if (currentCategory.size_type === "standard" || currentCategory.size_type === "both") {
        setHasVariants(true);
        if (currentCategory.standard_sizes && currentCategory.standard_sizes.length > 0) {
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
  }, [currentCategory]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;

    const newErrors: Record<string, string> = {};
    if (!form.product_name.trim()) newErrors.product_name = "Product name is required";
    if (!form.price) newErrors.price = "Price is required";
    else if (parseFloat(form.price) <= 0) newErrors.price = "Price must be a positive number";
    if (!selectedModelType) newErrors.model_type_id = "Model Type is required";
    if (!form.category_id) newErrors.category_id = "Category is required";
    if (imageFiles.length === 0) newErrors.images = "Please select at least one image";

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
      
      imageFiles.forEach(file => formData.append("images", file));
      
      await api.admin.createProductDirect(formData);
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

      <motion.form initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} onSubmit={handleSubmit} className="space-y-6">
        
        <ProductImageUpload
          imageFiles={imageFiles}
          setImageFiles={setImageFiles}
          imagePreviews={imagePreviews}
          setImagePreviews={setImagePreviews}
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
            {saving ? "Creating Product..." : "Create Product"}
          </button>
        </div>
      </motion.form>
    </div>
  );
}
