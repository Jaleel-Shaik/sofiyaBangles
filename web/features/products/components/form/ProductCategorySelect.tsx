import { type Category, type ModelType } from "@/src/lib/api";
import { FormState } from "./types";

interface ProductCategorySelectProps {
  modelTypes: ModelType[];
  selectedModelType: string;
  setSelectedModelType: (id: string) => void;
  filteredCategories: Category[];
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  errors: Record<string, string>;
  setErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>;
}

export function ProductCategorySelect({
  modelTypes,
  selectedModelType,
  setSelectedModelType,
  filteredCategories,
  form,
  setForm,
  errors,
  setErrors,
}: ProductCategorySelectProps) {
  return (
    <div className="bg-white rounded-2xl border border-[#E5E5E5] p-6 space-y-4">
      <div className="flex items-center gap-2 pb-2 border-b border-[#F5F5F5]">
        <svg className="w-5 h-5 text-[#E8436E]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
        <h2 className="text-lg font-bold text-[#171717]">Categorization</h2>
      </div>
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-semibold text-[#525252]">Model Type *</label>
          {errors.model_type_id && <span className="text-red-500 text-xs font-semibold">{errors.model_type_id}</span>}
        </div>
        <select
          value={selectedModelType}
          onChange={(e) => {
            setSelectedModelType(e.target.value);
            setForm(f => ({ ...f, category_id: "" }));
            if (e.target.value && errors.model_type_id) {
              setErrors(prev => { const copy = { ...prev }; delete copy.model_type_id; return copy; });
            }
          }}
          className={`w-full px-4 py-2.5 bg-white border rounded-xl outline-none focus:border-[#E8436E] transition-colors text-sm cursor-pointer ${
            errors.model_type_id ? "border-red-500 bg-red-50/5 focus:border-red-500" : "border-[#E5E5E5]"
          }`}
        >
          <option value="">Select Model Type</option>
          {modelTypes.map(mt => (
            <option key={mt.id} value={mt.id}>
              {mt.name}
            </option>
          ))}
        </select>
      </div>

      {selectedModelType && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-semibold text-[#525252]">Select Category *</label>
            {errors.category_id && <span className="text-red-500 text-xs font-semibold">{errors.category_id}</span>}
          </div>
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
                      const nextVal = form.category_id === c.id ? "" : c.id;
                      setForm(f => ({ ...f, category_id: nextVal }));
                      if (nextVal && errors.category_id) setErrors(prev => { const copy = { ...prev }; delete copy.category_id; return copy; });
                    }}
                    className={`flex items-center p-4 rounded-2xl border-2 cursor-pointer text-left w-full transition-all ${
                      isSelected
                        ? "bg-[#FFF0F3] border-[#E8436E] shadow-sm"
                        : errors.category_id
                          ? "bg-red-50/5 border-red-300 hover:border-red-500"
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
  );
}
