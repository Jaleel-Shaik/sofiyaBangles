import Link from "next/link";
import { Plus, Layers, FolderOpen, Check } from "lucide-react";
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
  const selectedModelTypeName = modelTypes.find(mt => mt.id === selectedModelType)?.name;

  return (
    <div className="bg-white rounded-2xl border border-[#E5E5E5] p-6 space-y-5">
      <div className="flex items-center gap-2.5 pb-3 border-b border-[#F5F5F5]">
        <div className="w-8 h-8 rounded-xl bg-[#E8436E]/10 text-[#E8436E] flex items-center justify-center">
          <Layers className="w-4 h-4" />
        </div>
        <div>
          <h2 className="text-base font-extrabold text-[#171717]">Collections & Model</h2>
          <p className="text-xs text-slate-500 font-medium">Link this product to a model type and collection sizing</p>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-xs font-black uppercase tracking-wider text-slate-500">
            Model Type <span className="text-rose-500">*</span>
          </label>
          {errors.model_type_id && (
            <span className="text-red-500 text-xs font-semibold">{errors.model_type_id}</span>
          )}
        </div>
        <select
          value={selectedModelType}
          onChange={(e) => {
            const nextModelId = e.target.value;
            setSelectedModelType(nextModelId);
            setForm(f => ({ ...f, category_id: "" }));
            if (nextModelId && errors.model_type_id) {
              setErrors(prev => { const copy = { ...prev }; delete copy.model_type_id; return copy; });
            }
          }}
          className={`w-full px-4 py-2.5 bg-white border rounded-xl outline-none focus:border-[#E8436E] transition-colors text-sm cursor-pointer font-medium ${
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
        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <label className="block text-xs font-black uppercase tracking-wider text-slate-500">
                Select Collection <span className="text-rose-500">*</span>
              </label>
              {errors.category_id && (
                <span className="text-red-500 text-xs font-semibold">- {errors.category_id}</span>
              )}
            </div>
            <Link
              href="/dashboard/categories"
              target="_blank"
              className="text-xs font-bold text-[#E8436E] hover:text-[#d0335e] bg-rose-50 hover:bg-rose-100 px-3 py-1 rounded-full transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Collection</span>
            </Link>
          </div>

          {filteredCategories.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
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
                      if (c.model_type_id && selectedModelType !== c.model_type_id) {
                        setSelectedModelType(c.model_type_id);
                      }
                      if (nextVal && errors.category_id) {
                        setErrors(prev => { const copy = { ...prev }; delete copy.category_id; return copy; });
                      }
                    }}
                    className={`flex items-start p-3.5 rounded-2xl border-2 cursor-pointer text-left w-full transition-all ${
                      isSelected
                        ? "bg-[#FFF0F3] border-[#E8436E] shadow-sm"
                        : errors.category_id
                          ? "bg-red-50/5 border-red-300 hover:border-red-500"
                          : "bg-white border-[#E5E5E5] hover:border-[#E8436E]"
                    }`}
                  >
                    <div className="w-14 h-14 rounded-xl bg-slate-100 mr-3.5 border border-slate-200 overflow-hidden flex-shrink-0 relative">
                      {c.image_url ? (
                        <img src={c.image_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400">
                          <FolderOpen className="w-5 h-5" />
                        </div>
                      )}
                    </div>
                    <div className="flex-grow min-w-0 pr-2">
                      <h3 className={`font-bold truncate text-sm leading-snug ${isSelected ? "text-[#E8436E]" : "text-[#171717]"}`}>
                        {c.category_name}
                      </h3>
                    </div>
                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 transition-colors mt-0.5 ${
                      isSelected ? "bg-[#E8436E] border-[#E8436E] text-white" : "border-[#D4D4D4] bg-white"
                    }`}>
                      {isSelected && (
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="border-2 border-dashed border-[#E5E5E5] rounded-2xl p-6 text-center text-slate-500 text-xs space-y-3 bg-slate-50/50">
              <FolderOpen className="w-8 h-8 text-slate-300 mx-auto" />
              <div>
                <p className="font-bold text-slate-700">No collections found for this model.</p>
                <p className="text-slate-400 text-[11px] mt-0.5">
                  Products in {selectedModelTypeName || "this model"} must be assigned to an active collection.
                </p>
              </div>
              <Link
                href="/dashboard/categories"
                target="_blank"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#E8436E] text-white text-xs font-bold shadow-sm hover:bg-[#d0335e] transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Collection</span>
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
