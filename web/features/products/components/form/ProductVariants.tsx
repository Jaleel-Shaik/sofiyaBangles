import { Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { type Category } from "@/src/lib/api";
import { FormState, VariantState } from "./types";

interface ProductVariantsProps {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  hasVariants: boolean;
  setHasVariants: (val: boolean) => void;
  variants: VariantState[];
  setVariants: React.Dispatch<React.SetStateAction<VariantState[]>>;
  currentCategory: Category | undefined;
  customSizeName: string;
  setCustomSizeName: (val: string) => void;
  acceptsCustomSize: boolean;
  setAcceptsCustomSize: (val: boolean) => void;
  customSizePrice: string;
  setCustomSizePrice: (val: string) => void;
  errors: Record<string, string>;
}

export function ProductVariants({
  form,
  setForm,
  hasVariants,
  setHasVariants,
  variants,
  setVariants,
  currentCategory,
  customSizeName,
  setCustomSizeName,
  acceptsCustomSize,
  setAcceptsCustomSize,
  customSizePrice,
  setCustomSizePrice,
  errors,
}: ProductVariantsProps) {
  const updateVariant = (id: string, field: "price" | "quantity", value: string) => {
    setVariants(prev => prev.map(v => v.id === id ? { ...v, [field]: value } : v));
  };

  const addCustomSize = () => {
    if (!customSizeName.trim()) {
      toast.error("Please enter a size name (e.g. 2.10, L, XL)");
      return;
    }
    const sizeName = customSizeName.trim();
    if (variants.some(v => v.size.toLowerCase() === sizeName.toLowerCase())) {
      toast.error(`Size "${sizeName}" already exists`);
      return;
    }
    setVariants(prev => [
      ...prev,
      {
        id: `v-${Math.random().toString(36).substr(2, 9)}`,
        size: sizeName,
        price: form.price || "0",
        quantity: "0",
      }
    ]);
    setCustomSizeName("");
  };

  const removeVariant = (id: string) => {
    setVariants(prev => prev.filter(v => v.id !== id));
  };

  return (
    <div className="bg-white rounded-2xl border border-[#E5E5E5] p-6 space-y-5">
      <div className="flex items-center justify-between pb-2 border-b border-[#F5F5F5]">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-[#E8436E]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <h2 className="text-lg font-bold text-[#171717]">Inventory & Sizing</h2>
        </div>
        
        <button
          type="button"
          onClick={() => {
            const nextHasVariants = !hasVariants;
            setHasVariants(nextHasVariants);
            if (nextHasVariants && variants.length === 0 && currentCategory?.standard_sizes) {
              setVariants(currentCategory.standard_sizes.map(sz => ({
                id: `v-${sz.replace(/\s+/g, "_")}`,
                size: sz,
                price: form.price || "0",
                quantity: form.quantity || "0",
              })));
            }
          }}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition-colors cursor-pointer ${
            hasVariants
              ? "bg-[#FFF0F3] border-[#E8436E] text-[#E8436E]"
              : "bg-[#FAFAFA] border-[#E5E5E5] text-[#737373] hover:border-[#D4D4D4]"
          }`}
        >
          <span className={`w-2 h-2 rounded-full ${hasVariants ? "bg-[#E8436E]" : "bg-[#D4D4D4]"}`} />
          {hasVariants ? "Size Variants: ON" : "Size Variants: OFF"}
        </button>
      </div>

      {!hasVariants ? (
        <div>
          <label className="block text-sm font-semibold text-[#525252] mb-1.5">Total Available Stock Quantity *</label>
          <input 
            type="number" 
            value={form.quantity} 
            onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} 
            className="w-full px-4 py-2.5 border border-[#E5E5E5] rounded-xl outline-none focus:border-[#E8436E]" 
            placeholder="e.g. 10" 
          />
          <p className="text-xs text-[#737373] mt-1.5">This product is treated as single-size / free-size with a uniform price of ₹{form.price || "0"}.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-semibold text-[#171717]">Size Variants List</label>
              <p className="text-xs text-[#737373]">Set individual price and stock for each size</p>
            </div>
            {variants.length > 0 && (
              <span className="text-xs font-bold text-[#E8436E] bg-[#FFF0F3] px-2.5 py-1 rounded-lg">
                Total Stock: {variants.reduce((sum, v) => sum + (parseInt(v.quantity) || 0), 0)} units
              </span>
            )}
          </div>

          <div className="flex gap-2 items-center bg-[#FAFAFA] p-3 rounded-2xl border border-[#E5E5E5]">
            <input
              type="text"
              placeholder="Add a size (e.g. 2.4, 2.6, 2.8, 2.10, Free Size, L, XL)..."
              value={customSizeName}
              onChange={e => setCustomSizeName(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addCustomSize(); } }}
              className="flex-1 px-3.5 py-2 border border-[#E5E5E5] rounded-xl outline-none focus:border-[#E8436E] text-sm bg-white font-medium"
            />
            <button
              type="button"
              onClick={addCustomSize}
              className="px-4 py-2 bg-[#171717] hover:bg-black text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
            >
              + Add Size
            </button>
          </div>

          {errors.variants && <p className="text-red-500 text-xs font-semibold">{errors.variants}</p>}

          {variants.length === 0 ? (
            <div className="border border-dashed border-[#E5E5E5] rounded-2xl p-6 text-center text-[#A3A3A3] text-sm">
              No sizes added yet. Use the field above to add sizes, or toggle Size Variants OFF for single-size items.
            </div>
          ) : (
            <div className="space-y-3">
              {variants.map(v => (
                <div key={v.id} className="flex items-center gap-3 bg-[#FAFAFA] p-3.5 rounded-2xl border border-[#E5E5E5]">
                  <div className="bg-[#E8436E] text-white font-black px-3.5 py-2.5 rounded-xl text-base min-w-[56px] text-center shadow-sm shadow-[#E8436E]/20">
                    {v.size}
                  </div>
                  <div className="flex-grow">
                    <label className="block text-[10px] text-[#A3A3A3] font-bold uppercase tracking-wider mb-1 ml-0.5">Price (₹)</label>
                    <input 
                      type="number" 
                      value={v.price} 
                      onChange={e => updateVariant(v.id, "price", e.target.value)} 
                      className="w-full px-3 py-2 border border-[#E5E5E5] rounded-xl outline-none focus:border-[#E8436E] text-sm bg-white font-medium" 
                    />
                  </div>
                  <div className="w-24">
                    <label className="block text-[10px] text-[#A3A3A3] font-bold uppercase tracking-wider mb-1 ml-0.5">Stock</label>
                    <input 
                      type="number" 
                      value={v.quantity} 
                      onChange={e => updateVariant(v.id, "quantity", e.target.value)} 
                      className="w-full px-3 py-2 border border-[#E5E5E5] rounded-xl outline-none focus:border-[#E8436E] text-sm bg-white font-medium" 
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeVariant(v.id)}
                    className="p-2 text-[#A3A3A3] hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors cursor-pointer self-end mb-1"
                    title="Remove size"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="pt-2 border-t border-[#F5F5F5]">
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-semibold text-[#171717]">Accepts Custom Made-to-Order Sizing</label>
          <button
            type="button"
            onClick={() => setAcceptsCustomSize(!acceptsCustomSize)}
            className={`px-3 py-1 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
              acceptsCustomSize ? "bg-[#FFF0F3] border-[#E8436E] text-[#E8436E]" : "bg-[#FAFAFA] border-[#E5E5E5] text-[#737373]"
            }`}
          >
            {acceptsCustomSize ? "Custom Sizing: ON" : "Custom Sizing: OFF"}
          </button>
        </div>

        {acceptsCustomSize && (
          <div className="bg-[#FFF0F3] p-4 rounded-2xl border border-[#E8436E]/10 space-y-3">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-[#E8436E]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.121 14.121L19 19m-7-7h7m-7-6a2 2 0 11-4 0 2 2 0 014 0zM9 11a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span className="text-xs font-bold text-[#E8436E]">Custom Measurements Sizing</span>
            </div>
            <p className="text-xs text-[#737373] leading-relaxed">
              Customers can enter their custom measurements {currentCategory?.custom_measurement_fields?.length ? `(${currentCategory.custom_measurement_fields.join(", ")})` : ""} when purchasing.
            </p>
            <div>
              <label className="block text-xs font-bold text-[#525252] uppercase tracking-wider mb-1">Custom Size Price (₹)</label>
              <input 
                type="number" 
                step="0.01" 
                value={customSizePrice} 
                onChange={e => setCustomSizePrice(e.target.value)} 
                className="w-full px-4 py-2.5 border border-[#E5E5E5] rounded-xl outline-none focus:border-[#E8436E] bg-white text-sm" 
                placeholder="e.g. 3000" 
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
