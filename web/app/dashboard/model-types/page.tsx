"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Plus, Edit, Trash2, Layers, X, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { adminApi, type ModelType } from "@/src/lib/api";

export default function ModelTypesPage() {
  const [modelTypes, setModelTypes] = useState<ModelType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await adminApi.getModelTypes();
      setModelTypes(data);
    } catch {
      toast.error("Failed to load model types");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setName("");
  };

  const handleEdit = (mt: ModelType) => {
    setEditingId(mt.id);
    setName(mt.name);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!name.trim()) { toast.error("Name is required"); return; }
    setSaving(true);
    try {
      if (editingId) {
        await adminApi.updateModelType(editingId, { name });
        toast.success("Updated");
      } else {
        await adminApi.createModelType({ name });
        toast.success("Created");
      }
      resetForm();
      fetchData();
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this model type?")) return;
    try {
      await adminApi.deleteModelType(id);
      toast.success("Deleted");
      fetchData();
    } catch {
      toast.error("Failed to delete");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#171717]">Model Types</h1>
          <p className="text-[#737373] mt-1">{modelTypes.length} model types</p>
        </div>
        {!showForm && (
          <button onClick={() => setShowForm(true)} className="gradient-primary text-white font-semibold py-2.5 px-5 rounded-xl flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add Model Type
          </button>
        )}
      </div>

      {showForm && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl border border-[#E5E5E5] p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-[#171717]">{editingId ? "Edit" : "Create"} Model Type</h2>
            <button onClick={resetForm} className="p-1.5 rounded-lg hover:bg-[#F5F5F5]"><X className="w-5 h-5" /></button>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#525252] mb-1">Name</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Bangles, Rings" className="w-full px-4 py-2.5 border border-[#E5E5E5] rounded-xl outline-none focus:border-[#E8436E]" />
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
      ) : modelTypes.length === 0 ? (
        <div className="text-center py-20 text-[#A3A3A3]">
          <Layers className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">No model types</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {modelTypes.map((mt, i) => (
            <motion.div key={mt.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="bg-white rounded-2xl border border-[#E5E5E5] p-4 flex items-center justify-between hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center"><Layers className="w-5 h-5 text-purple-500" /></div>
                <p className="font-semibold text-[#171717]">{mt.name}</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => handleEdit(mt)} className="p-2 rounded-xl bg-[#F5F5F5] hover:bg-[#E5E5E5]"><Edit className="w-4 h-4 text-[#525252]" /></button>
                <button onClick={() => handleDelete(mt.id)} className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100"><Trash2 className="w-4 h-4 text-red-500" /></button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
