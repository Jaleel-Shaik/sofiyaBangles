"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Plus, Edit, Trash2, Layers, X, Sparkles } from "lucide-react";
import toast from "react-hot-toast";
import { api, type ModelType } from "@/src/lib/api";
import { Button, Input, Card, CardContent, CardHeader, CardTitle, ConfirmDialog, EmptyState } from "@/src/components/ui";
import { STRINGS } from "@/src/constants/strings";

export default function ModelTypesPage() {
  const [modelTypes, setModelTypes] = useState<ModelType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  // Accessible ConfirmDialog state
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [targetModelType, setTargetModelType] = useState<ModelType | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await api.admin.getModelTypes();
      setModelTypes(data || []);
    } catch {
      toast.error("Failed to load model types");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

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
    if (saving) return;
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        await api.admin.updateModelType(editingId, { name: name.trim() });
        toast.success(STRINGS.modelTypes.updatedSuccess);
      } else {
        await api.admin.createModelType({ name: name.trim() });
        toast.success(STRINGS.modelTypes.createdSuccess);
      }
      resetForm();
      fetchData();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || e.message || "Failed to save model type");
    } finally {
      setSaving(false);
    }
  };

  const openDeleteConfirm = (mt: ModelType) => {
    setTargetModelType(mt);
    setConfirmDeleteOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!targetModelType) return;
    setDeleting(true);
    try {
      await api.admin.deleteModelType(targetModelType.id);
      toast.success(STRINGS.modelTypes.deletedSuccess);
      setConfirmDeleteOpen(false);
      setTargetModelType(null);
      fetchData();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || e.message || "Failed to delete model type");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            {STRINGS.modelTypes.title}
          </h1>
          <p className="text-xs font-semibold text-slate-400 mt-1">
            {STRINGS.modelTypes.subtitle(modelTypes.length)}
          </p>
        </div>
        {!showForm && (
          <Button
            variant="primary"
            size="md"
            onClick={() => setShowForm(true)}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            {STRINGS.modelTypes.addModelType}
          </Button>
        )}
      </div>

      {/* Model Type Form Card */}
      {showForm && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
        >
          <Card className="border-[#E8436E]/20 shadow-md">
            <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 pb-3">
              <CardTitle className="text-base">
                {editingId ? STRINGS.modelTypes.editModelType : STRINGS.modelTypes.createModelType}
              </CardTitle>
              <button
                type="button"
                onClick={resetForm}
                aria-label={STRINGS.common.close}
                className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <Input
                label={STRINGS.modelTypes.name}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={STRINGS.modelTypes.namePlaceholder}
                helperText="Identifies product variations and sizing formulas (e.g. Bangles, Necklaces, Rings)."
                autoFocus
              />
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" size="md" onClick={resetForm}>
                  {STRINGS.common.cancel}
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleSave}
                  isLoading={saving}
                >
                  {STRINGS.common.save}
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Model Types List / Empty State */}
      {loading ? (
        <div className="flex justify-center items-center py-24">
          <div className="w-10 h-10 border-3 border-[#E8436E] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : modelTypes.length === 0 ? (
        <EmptyState
          icon={<Layers className="w-8 h-8 text-[#E8436E]" />}
          title={STRINGS.modelTypes.emptyTitle}
          description={STRINGS.modelTypes.emptyDescription}
          actionLabel={STRINGS.modelTypes.addModelType}
          onAction={() => setShowForm(true)}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {modelTypes.map((mt, i) => (
            <motion.div
              key={mt.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 shadow-2xs">
                      <Layers className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-800 text-sm">{mt.name}</p>
                      <p className="text-[11px] text-slate-400 font-mono">ID: {mt.id}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleEdit(mt)}
                      aria-label={`${STRINGS.common.edit} ${mt.name}`}
                      className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => openDeleteConfirm(mt)}
                      aria-label={`${STRINGS.common.delete} ${mt.name}`}
                      className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Accessible ConfirmDialog for Model Type Deletion */}
      <ConfirmDialog
        isOpen={confirmDeleteOpen}
        onClose={() => {
          setConfirmDeleteOpen(false);
          setTargetModelType(null);
        }}
        onConfirm={handleDeleteConfirm}
        title={STRINGS.modelTypes.deleteConfirmTitle}
        message={
          targetModelType
            ? STRINGS.modelTypes.deleteConfirmMessage(targetModelType.name)
            : ""
        }
        confirmLabel={STRINGS.common.delete}
        cancelLabel={STRINGS.common.cancel}
        variant="destructive"
        isLoading={deleting}
      />
    </div>
  );
}
