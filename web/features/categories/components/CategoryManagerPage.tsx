"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Plus, Edit, Trash2, FolderOpen, X, Loader2, Layers } from "lucide-react";
import toast from "react-hot-toast";
import { adminApi, type Category, type ModelType } from "@/src/lib/api";

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [modelTypes, setModelTypes] = useState<ModelType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [selectedModelType, setSelectedModelType] = useState("");
  const [sizes, setSizes] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      const [cats, mts] = await Promise.all([
        adminApi.getCategories(),
        adminApi.getModelTypes(),
      ]);
      setCategories(cats);
      setModelTypes(mts);
    } catch {
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setName("");
    setSelectedModelType("");
    setSizes("");
  };

  const handleEdit = (cat: Category) => {
    setEditingId(cat.id);
    setName(cat.category_name);
    setSelectedModelType(cat.model_type_id || "");
    setSizes(cat.standard_sizes?.join(", ") || "");
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!name.trim()) { toast.error("Category name is required"); return; }
    if (!selectedModelType) { toast.error("Model type is required"); return; }
    setSaving(true);
    try {
      const data = {
        category_name: name,
        model_type_id: selectedModelType,
        standard_sizes: sizes.split(",").map(s => s.trim()).filter(Boolean),
      };
      if (editingId) {
        await adminApi.updateCategory(editingId, data);
        toast.success("Category updated");
      } else {
        await adminApi.createCategory(data);
        toast.success("Category created");
      }
      resetForm();
      fetchData();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || e.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this category?")) return;
    try {
      await adminApi.deleteCategory(id);
      toast.success("Category deleted");
      fetchData();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || e.message || "Failed to delete");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#171717]">Categories</h1>
          <p className="text-[#737373] mt-1">{categories.length} categories</p>
        </div>
        {!showForm && (
          <button onClick={() => setShowForm(true)} className="gradient-primary text-white font-semibold py-2.5 px-5 rounded-xl flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add Category
          </button>
        )}
      </div>

      {showForm && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl border border-[#E5E5E5] p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-[#171717]">{editingId ? "Edit" : "Create"} Category</h2>
            <button onClick={resetForm} className="p-1.5 rounded-lg hover:bg-[#F5F5F5]"><X className="w-5 h-5" /></button>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#525252] mb-1">Category Name</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Silver Bangles" className="w-full px-4 py-2.5 border border-[#E5E5E5] rounded-xl outline-none focus:border-[#E8436E]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#525252] mb-1">Model Type</label>
              <div className="flex flex-wrap gap-2">
                {modelTypes.map(mt => (
                  <button key={mt.id} onClick={() => setSelectedModelType(mt.id)} className={`px-4 py-2 rounded-xl border text-sm font-medium transition-colors ${selectedModelType === mt.id ? "border-[#E8436E] bg-rose-50 text-[#E8436E]" : "border-[#E5E5E5] text-[#525252] hover:bg-[#F5F5F5]"}`}>
                    {mt.name}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#525252] mb-1">Standard Sizes (comma separated)</label>
              <input value={sizes} onChange={e => setSizes(e.target.value)} placeholder="e.g. 2.2, 2.4, 2.6" className="w-full px-4 py-2.5 border border-[#E5E5E5] rounded-xl outline-none focus:border-[#E8436E]" />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={resetForm} className="px-5 py-2.5 text-sm font-medium text-[#525252]">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="gradient-primary text-white font-semibold py-2.5 px-6 rounded-xl">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-[#E8436E]" /></div>
      ) : categories.length === 0 ? (
        <div className="text-center py-20 text-[#A3A3A3]">
          <FolderOpen className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">No categories yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((cat, i) => {
            const mt = modelTypes.find(m => m.id === cat.model_type_id);
            return (
              <motion.div key={cat.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                className="bg-white rounded-2xl border border-[#E5E5E5] overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all duration-200 group"
              >
                <div className="aspect-[4/3] bg-[#F5F5F5] overflow-hidden">
                  {cat.image_url ? (
                    <img src={cat.image_url} alt={cat.category_name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <FolderOpen className="w-12 h-12 text-[#CBD5E1]" />
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <p className="font-semibold text-[#171717] text-sm truncate">{cat.category_name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {mt && <span className="text-xs flex items-center gap-1 text-[#64748B]"><Layers className="w-3 h-3" />{mt.name}</span>}
                    {cat.standard_sizes && <span className="text-xs text-[#94A3B8]">Sizes: {cat.standard_sizes.join(", ")}</span>}
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#E5E5E5]">
                    <span className="text-xs text-[#A3A3A3]">Category</span>
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleEdit(cat)} className="p-1.5 rounded-lg bg-[#F5F5F5] hover:bg-[#E5E5E5] transition-colors"><Edit className="w-3.5 h-3.5 text-[#525252]" /></button>
                      <button onClick={() => handleDelete(cat.id)} className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 transition-colors"><Trash2 className="w-3.5 h-3.5 text-red-500" /></button>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
