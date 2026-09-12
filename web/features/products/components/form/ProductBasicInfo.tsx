import { FormState } from "./types";

interface ProductBasicInfoProps {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  errors: Record<string, string>;
  setErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  setCustomSizePrice: (price: string) => void;
}

export function ProductBasicInfo({
  form,
  setForm,
  errors,
  setErrors,
  setCustomSizePrice,
}: ProductBasicInfoProps) {
  return (
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
          <input 
            value={form.product_name} 
            onChange={e => {
              setForm(f => ({ ...f, product_name: e.target.value }));
              if (errors.product_name) setErrors(prev => { const c = { ...prev }; delete c.product_name; return c; });
            }} 
            className={`w-full px-4 py-2.5 border rounded-xl outline-none focus:border-[#E8436E] transition-colors ${
              errors.product_name ? "border-red-500 bg-red-50/10 focus:border-red-500" : "border-[#E5E5E5]"
            }`} 
            placeholder="e.g. Royal Diamond Bangle" 
          />
          {errors.product_name && <p className="text-red-500 text-xs mt-1.5 font-semibold">{errors.product_name}</p>}
        </div>
        <div className="col-span-2 md:col-span-1">
          <label className="block text-sm font-semibold text-[#525252] mb-1.5">Base Price (₹) *</label>
          <input 
            type="number" 
            step="0.01" 
            value={form.price} 
            onChange={e => {
              setForm(f => ({ ...f, price: e.target.value }));
              setCustomSizePrice(e.target.value);
              if (errors.price) setErrors(prev => { const c = { ...prev }; delete c.price; return c; });
            }} 
            className={`w-full px-4 py-2.5 border rounded-xl outline-none focus:border-[#E8436E] transition-colors ${
              errors.price ? "border-red-500 bg-red-50/10 focus:border-red-500" : "border-[#E5E5E5]"
            }`} 
            placeholder="e.g. 2500" 
          />
          {errors.price && <p className="text-red-500 text-xs mt-1.5 font-semibold">{errors.price}</p>}
        </div>
        <div className="col-span-2">
          <label className="block text-sm font-semibold text-[#525252] mb-1.5">Description</label>
          <textarea 
            value={form.description} 
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))} 
            rows={3} 
            className="w-full px-4 py-2.5 border border-[#E5E5E5] rounded-xl outline-none focus:border-[#E8436E] transition-colors" 
            placeholder="Write a beautiful description..." 
          />
        </div>
        <div className="col-span-2">
          <label className="block text-sm font-semibold text-[#525252] mb-1.5">Product Status *</label>
          <select
            value={form.status}
            onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
            className="w-full px-4 py-2.5 bg-white border border-[#E5E5E5] rounded-xl outline-none focus:border-[#E8436E] transition-colors text-sm cursor-pointer"
          >
            <option value="active">Active (Visible and sellable)</option>
            <option value="draft">Draft (Hidden)</option>
            <option value="out_of_stock">Out of Stock (Visible, not sellable)</option>
          </select>
        </div>
      </div>
    </div>
  );
}
