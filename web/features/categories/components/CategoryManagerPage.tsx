import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FolderOpen, Layers, Plus, LayoutGrid, List } from "lucide-react";
import toast from "react-hot-toast";
import { api, type Category, type ModelType } from "@/src/lib/api";
import { Button, Input, Card, Badge, ConfirmDialog, EmptyState, AppIcon, AuthenticatedImage } from "@/src/components/ui";
import { STRINGS } from "@/src/constants/strings";

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
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  // Confirm delete dialog state
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [cats, mts] = await Promise.all([
        api.admin.getCategories(),
        api.admin.getModelTypes(),
      ]);
      setCategories(cats || []);
      setModelTypes(mts || []);
    } catch {
      toast.error("Failed to load collections");
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
    if (saving) return;
    if (!name.trim()) {
      toast.error("Category name is required");
      return;
    }
    if (!selectedModelType) {
      toast.error("Please select a Model Type");
      return;
    }
    setSaving(true);
    try {
      const data = {
        category_name: name.trim(),
        model_type_id: selectedModelType,
        standard_sizes: sizes.split(",").map((s) => s.trim()).filter(Boolean),
      };
      if (editingId) {
        await api.admin.updateCategory(editingId, data);
        toast.success(STRINGS.categories.updatedSuccess);
      } else {
        await api.admin.createCategory(data);
        toast.success(STRINGS.categories.createdSuccess);
      }
      resetForm();
      fetchData();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || e.message || "Failed to save collection");
    } finally {
      setSaving(false);
    }
  };

  const confirmDeleteCategory = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await api.admin.deleteCategory(deleteTarget.id);
      toast.success(STRINGS.categories.deletedSuccess);
      setDeleteTarget(null);
      fetchData();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || e.message || "Failed to delete collection");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            {STRINGS.categories.title}
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            {STRINGS.categories.subtitle(categories.length)}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* View Mode Toggle Buttons (Grid / Table) */}
          <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`p-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${
                viewMode === "grid"
                  ? "bg-rose-50 text-[#E8436E] border border-rose-200"
                  : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
              }`}
              title="Compact Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
              <span className="hidden sm:inline">Grid</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`p-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${
                viewMode === "table"
                  ? "bg-rose-50 text-[#E8436E] border border-rose-200"
                  : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
              }`}
              title="Table List View"
            >
              <List className="w-4 h-4" />
              <span className="hidden sm:inline">Table</span>
            </button>
          </div>

          {!showForm && (
            <Button
              onClick={() => setShowForm(true)}
              variant="primary"
              leftIcon={<Plus className="w-4 h-4" />}
            >
              {STRINGS.categories.addCategory}
            </Button>
          )}
        </div>
      </div>

      {/* Add / Edit Form Card */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <Card className="border-rose-200/60 shadow-md">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-rose-50/30">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[#E8436E]/10 text-[#E8436E] flex items-center justify-center">
                    <Layers className="w-4 h-4" />
                  </div>
                  <h2 className="text-sm font-bold text-slate-900">
                    {editingId ? STRINGS.categories.editCategory : STRINGS.categories.addCategory}
                  </h2>
                </div>
                <button
                  onClick={resetForm}
                  className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors"
                  aria-label={STRINGS.common.close}
                >
                  <AppIcon name="close" size={16} />
                </button>
              </div>

              <div className="p-6 space-y-5">
                <Input
                  label={STRINGS.categories.categoryName}
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={STRINGS.categories.categoryNamePlaceholder}
                />

                <div>
                  <label className="block text-xs font-bold text-slate-700 tracking-wide mb-2">
                    {STRINGS.categories.modelType} <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {modelTypes.map((mt) => {
                      const isSelected = selectedModelType === mt.id;
                      return (
                        <button
                          key={mt.id}
                          type="button"
                          onClick={() => setSelectedModelType(mt.id)}
                          className={`px-4 py-2 rounded-xl border text-xs font-semibold transition-all min-h-[40px] ${
                            isSelected
                              ? 'border-[#E8436E] bg-rose-50 text-[#E8436E] shadow-2xs'
                              : 'border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300'
                          }`}
                        >
                          {mt.name}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                  <Button variant="outline" onClick={resetForm} disabled={saving}>
                    {STRINGS.common.cancel}
                  </Button>
                  <Button variant="primary" onClick={handleSave} isLoading={saving}>
                    {STRINGS.common.save}
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Grid / Table of Categories / Empty State */}
      {loading ? (
        <div className="flex justify-center py-24">
          <div className="text-center">
            <div className="w-10 h-10 border-3 border-[#E8436E] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs text-slate-500 font-medium">{STRINGS.common.loading}</p>
          </div>
        </div>
      ) : categories.length === 0 ? (
        <EmptyState
          icon={<FolderOpen className="w-8 h-8" />}
          title={STRINGS.categories.emptyTitle}
          description={STRINGS.categories.emptyDescription}
          actionLabel={STRINGS.categories.addCategory}
          onAction={() => setShowForm(true)}
        />
      ) : viewMode === "table" ? (
        /* Standardized Table View */
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase font-black tracking-wider">
                <tr>
                  <th className="p-3.5 pl-4">Collection Info</th>
                  <th className="p-3.5">Model Type</th>
                  <th className="p-3.5 text-right pr-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {categories.map((cat) => {
                  const mt = modelTypes.find((m) => m.id === cat.model_type_id);
                  return (
                    <tr key={cat.id} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="p-3.5 pl-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-slate-100 overflow-hidden border border-slate-200 shrink-0 relative shadow-2xs">
                            {cat.image_url ? (
                              <AuthenticatedImage
                                src={cat.image_url}
                                alt={cat.category_name}
                                className="w-full h-full object-cover"
                                fallbackIcon={<FolderOpen className="w-4 h-4 text-slate-400" />}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-400">
                                <FolderOpen className="w-4 h-4" />
                              </div>
                            )}
                          </div>
                          <span className="font-extrabold text-slate-900">{cat.category_name}</span>
                        </div>
                      </td>

                      <td className="p-3.5">
                        {mt ? (
                          <Badge variant="neutral" leftIcon={<Layers className="w-3 h-3" />}>
                            {mt.name}
                          </Badge>
                        ) : (
                          <span className="text-slate-400 font-medium">Bangles</span>
                        )}
                      </td>

                      <td className="p-3.5 pr-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleEdit(cat)}
                            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                            title={STRINGS.common.edit}
                          >
                            <AppIcon name="edit" size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget({ id: cat.id, name: cat.category_name })}
                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title={STRINGS.common.delete}
                          >
                            <AppIcon name="delete" size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Standardized Compact Grid View */
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3.5">
          {categories.map((cat, i) => {
            const mt = modelTypes.find((m) => m.id === cat.model_type_id);
            return (
              <motion.div
                key={cat.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <Card hoverable className="flex flex-col h-full overflow-hidden group">
                  {/* Compact Image Container (h-28) */}
                  <div className="h-28 bg-slate-100 overflow-hidden relative shrink-0">
                    {cat.image_url ? (
                      <AuthenticatedImage
                        src={cat.image_url}
                        alt={cat.category_name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        fallbackIcon={<FolderOpen className="w-7 h-7 text-slate-300" />}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300">
                        <FolderOpen className="w-7 h-7" />
                      </div>
                    )}
                  </div>

                  <div className="p-3 flex-1 flex flex-col justify-between space-y-2">
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-xs truncate leading-snug">
                        {cat.category_name}
                      </h3>
                      <div className="flex flex-wrap items-center gap-1 mt-1">
                        {mt && (
                          <Badge variant="neutral" leftIcon={<Layers className="w-2.5 h-2.5" />}>
                            {mt.name}
                          </Badge>
                        )}

                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                      <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                        Collection
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleEdit(cat)}
                          className="w-7 h-7 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 flex items-center justify-center transition-colors border border-slate-200/60"
                          title={STRINGS.common.edit}
                          aria-label={`Edit ${cat.category_name}`}
                        >
                          <AppIcon name="edit" size={13} />
                        </button>
                        <button
                          onClick={() => setDeleteTarget({ id: cat.id, name: cat.category_name })}
                          className="w-7 h-7 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center transition-colors border border-rose-100"
                          title={STRINGS.common.delete}
                          aria-label={`Delete ${cat.category_name}`}
                        >
                          <AppIcon name="delete" size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Accessible Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDeleteCategory}
        isLoading={isDeleting}
        title={STRINGS.categories.deleteConfirmTitle}
        message={deleteTarget ? STRINGS.categories.deleteConfirmMessage(deleteTarget.name) : ""}
      />
    </div>
  );
}
