"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FolderOpen, Layers, Plus, LayoutGrid, List, Sparkles, Image as ImageIcon, X, RefreshCw } from "lucide-react";
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
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  // Form states
  const [name, setName] = useState("");
  const [selectedModelType, setSelectedModelType] = useState("");
  const [isCreatingNewModel, setIsCreatingNewModel] = useState(false);
  const [newModelName, setNewModelName] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

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
    setIsCreatingNewModel(false);
    setNewModelName("");
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleEdit = (cat: Category) => {
    setEditingId(cat.id);
    setName(cat.category_name);
    setSelectedModelType(cat.model_type_id || "");
    setIsCreatingNewModel(false);
    setNewModelName("");
    setImageFile(null);
    setImagePreview(cat.image_url || null);
    setShowForm(true);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        toast.error("Please select a valid image file");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image file size must be under 5MB");
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        setImagePreview(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSave = async () => {
    if (saving) return;

    if (!selectedModelType && !isCreatingNewModel) {
      toast.error(STRINGS.categories.selectModelTypePrompt);
      return;
    }

    if (isCreatingNewModel && !newModelName.trim()) {
      toast.error(STRINGS.categories.enterModelTypeName);
      return;
    }

    if (!name.trim()) {
      toast.error(STRINGS.categories.enterCollectionName);
      return;
    }

    setSaving(true);
    try {
      let finalModelTypeId = selectedModelType;

      if (isCreatingNewModel) {
        const createdModel = await api.admin.createModelType({ name: newModelName.trim() });
        finalModelTypeId = createdModel.id;
      }

      const payload = {
        category_name: name.trim(),
        model_type_id: finalModelTypeId,
        image: imageFile || imagePreview,
      };

      if (editingId) {
        await api.admin.updateCategory(editingId, payload);
        toast.success(STRINGS.categories.updatedSuccess);
      } else {
        await api.admin.createCategory(payload);
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
              onClick={() => {
                resetForm();
                setShowForm(true);
              }}
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
            <Card className="border-rose-200/60 shadow-lg overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-rose-50/40">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#E8436E]/10 text-[#E8436E] flex items-center justify-center font-bold">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-extrabold text-slate-900">
                      {editingId ? STRINGS.categories.editCategory : STRINGS.categories.addNewCollection}
                    </h2>
                    <p className="text-[11px] text-slate-500 font-medium">
                      Configure collection categorization and imagery
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={resetForm}
                  className="w-8 h-8 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-white flex items-center justify-center transition-colors border border-transparent hover:border-slate-200"
                  aria-label={STRINGS.common.close}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* STEP 1: SELECT OR CREATE MODEL TYPE */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-500">
                      {STRINGS.categories.modelTypeSelectOrCreate} <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[10px] text-slate-400 font-medium">Step 1 of 2</span>
                  </div>

                  <div className="flex flex-wrap gap-2 items-center">
                    {modelTypes.map((mt) => {
                      const isSelected = !isCreatingNewModel && selectedModelType === mt.id;
                      return (
                        <button
                          key={mt.id}
                          type="button"
                          onClick={() => {
                            setSelectedModelType(mt.id);
                            setIsCreatingNewModel(false);
                          }}
                          className={`px-4 py-2.5 rounded-xl border text-xs font-bold transition-all min-h-[42px] cursor-pointer flex items-center gap-1.5 ${
                            isSelected
                              ? "border-[#E8436E] bg-rose-50 text-[#E8436E] shadow-2xs ring-2 ring-rose-200/50"
                              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300"
                          }`}
                        >
                          <Layers className={`w-3.5 h-3.5 ${isSelected ? "text-[#E8436E]" : "text-slate-400"}`} />
                          {mt.name}
                        </button>
                      );
                    })}

                    <button
                      type="button"
                      onClick={() => {
                        setIsCreatingNewModel(true);
                        setSelectedModelType("");
                      }}
                      className={`px-4 py-2.5 rounded-xl border-2 text-xs font-bold transition-all min-h-[42px] cursor-pointer flex items-center gap-1.5 ${
                        isCreatingNewModel
                          ? "border-[#E8436E] bg-[#E8436E] text-white shadow-sm"
                          : "border-dashed border-rose-300 bg-rose-50/50 text-[#E8436E] hover:bg-rose-50 hover:border-[#E8436E]"
                      }`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      {STRINGS.categories.createNewModel}
                    </button>
                  </div>

                  {/* Inline define new model type */}
                  <AnimatePresence>
                    {isCreatingNewModel && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="pt-2"
                      >
                        <div className="bg-rose-50/40 border border-rose-200 rounded-2xl p-4 space-y-2">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                            <Sparkles className="w-4 h-4 text-[#E8436E]" />
                            <span>{STRINGS.categories.defineNewModelType}</span>
                          </div>
                          <Input
                            value={newModelName}
                            onChange={(e) => setNewModelName(e.target.value)}
                            placeholder={STRINGS.categories.modelNamePlaceholder}
                            className="bg-white border-rose-200 focus:border-[#E8436E]"
                            autoFocus
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <hr className="border-slate-100" />

                {/* STEP 2: COLLECTION DETAILS */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-500">
                      {STRINGS.categories.stepDetails}
                    </h3>
                    <span className="text-[10px] text-slate-400 font-medium">Step 2 of 2</span>
                  </div>

                  <Input
                    label={STRINGS.categories.categoryName}
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={STRINGS.categories.categoryNamePlaceholder}
                  />

                  {/* Image Upload Area */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 tracking-wide mb-1.5">
                      {STRINGS.categories.collectionImage}
                    </label>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/jpg"
                      className="hidden"
                      onChange={handleImageChange}
                    />

                    {imagePreview ? (
                      <div className="relative h-44 rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 group max-w-md">
                        <img
                          src={imagePreview}
                          alt="Collection preview"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-3">
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="px-3.5 py-1.5 rounded-xl bg-white text-slate-800 text-xs font-bold shadow-md hover:bg-slate-50 transition-colors flex items-center gap-1.5 cursor-pointer"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            {STRINGS.categories.changePhoto}
                          </button>
                          <button
                            type="button"
                            onClick={handleRemoveImage}
                            className="px-3.5 py-1.5 rounded-xl bg-rose-600 text-white text-xs font-bold shadow-md hover:bg-rose-700 transition-colors flex items-center gap-1.5 cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                            {STRINGS.categories.removePhoto}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault();
                          const file = e.dataTransfer.files?.[0];
                          if (file) {
                            const dummyEvent = {
                              target: { files: [file] },
                            } as unknown as React.ChangeEvent<HTMLInputElement>;
                            handleImageChange(dummyEvent);
                          }
                        }}
                        className="h-36 rounded-2xl border-2 border-dashed border-slate-200 hover:border-[#E8436E] bg-slate-50/50 hover:bg-rose-50/20 transition-all flex flex-col items-center justify-center cursor-pointer p-4 text-center max-w-md"
                      >
                        <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mb-2">
                          <ImageIcon className="w-5 h-5" />
                        </div>
                        <p className="text-xs font-bold text-slate-700">
                          {STRINGS.categories.uploadImageHint}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {STRINGS.categories.uploadImageSubhint}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Form Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                  <Button variant="outline" onClick={resetForm} disabled={saving}>
                    {STRINGS.common.cancel}
                  </Button>
                  <Button variant="primary" onClick={handleSave} isLoading={saving}>
                    {saving ? STRINGS.common.saving : STRINGS.common.save}
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
          onAction={() => {
            resetForm();
            setShowForm(true);
          }}
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
                          <div className="w-11 h-11 rounded-xl bg-slate-100 overflow-hidden border border-slate-200 shrink-0 relative shadow-2xs">
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
                          <div>
                            <span className="font-extrabold text-slate-900 text-sm block">
                              {cat.category_name}
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium">
                              ID: {cat.id.slice(0, 8)}
                            </span>
                          </div>
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
                            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            title={STRINGS.common.edit}
                          >
                            <AppIcon name="edit" size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget({ id: cat.id, name: cat.category_name })}
                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {categories.map((cat, i) => {
            const mt = modelTypes.find((m) => m.id === cat.model_type_id);
            return (
              <motion.div
                key={cat.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <Card hoverable className="flex flex-col h-full overflow-hidden group border-slate-200/90 shadow-2xs">
                  {/* Image Container (h-36) */}
                  <div className="h-36 bg-slate-100 overflow-hidden relative shrink-0">
                    {cat.image_url ? (
                      <AuthenticatedImage
                        src={cat.image_url}
                        alt={cat.category_name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        fallbackIcon={<FolderOpen className="w-8 h-8 text-slate-300" />}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300">
                        <FolderOpen className="w-8 h-8" />
                      </div>
                    )}
                  </div>

                  <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-extrabold text-slate-900 text-sm leading-snug line-clamp-1">
                          {cat.category_name}
                        </h3>
                        {mt && (
                          <Badge variant="neutral" leftIcon={<Layers className="w-2.5 h-2.5" />}>
                            {mt.name}
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2.5 border-t border-slate-100">
                      <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                        Collection
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleEdit(cat)}
                          className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 flex items-center justify-center transition-colors border border-slate-200/60 cursor-pointer"
                          title={STRINGS.common.edit}
                          aria-label={`Edit ${cat.category_name}`}
                        >
                          <AppIcon name="edit" size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget({ id: cat.id, name: cat.category_name })}
                          className="w-8 h-8 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center transition-colors border border-rose-100 cursor-pointer"
                          title={STRINGS.common.delete}
                          aria-label={`Delete ${cat.category_name}`}
                        >
                          <AppIcon name="delete" size={14} />
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
