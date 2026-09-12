import { useRef, useState } from "react";
import { Upload, X, Info, Plus } from "lucide-react";
import toast from "react-hot-toast";

interface ProductImageUploadProps {
  imageFiles: File[];
  setImageFiles: React.Dispatch<React.SetStateAction<File[]>>;
  imagePreviews: string[];
  setImagePreviews: React.Dispatch<React.SetStateAction<string[]>>;
  errors: Record<string, string>;
  setErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  maxImages?: number;
}

export function ProductImageUpload({
  imageFiles,
  setImageFiles,
  imagePreviews,
  setImagePreviews,
  errors,
  setErrors,
  maxImages = 7,
}: ProductImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const addFiles = (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    if (imageFiles.length >= maxImages) {
      toast.error(`Maximum image limit reached! Only up to ${maxImages} images are allowed per product.`);
      return;
    }

    const validFiles: File[] = [];
    const validPreviews: string[] = [];

    fileArray.forEach(file => {
      if (file.type?.startsWith("image/") || /\.(jpg|jpeg|png|webp|gif|svg|heic|bmp|jfif)$/i.test(file.name)) {
        validFiles.push(file);
        try {
          validPreviews.push(URL.createObjectURL(file));
        } catch {
          // fallback
        }
      }
    });

    if (validFiles.length === 0) {
      toast.error("Please select valid image files (JPG, PNG, WEBP)");
      return;
    }

    const availableSlots = maxImages - imageFiles.length;
    if (validFiles.length > availableSlots) {
      toast.error(`Max limit exceeded! Only ${availableSlots} more image(s) added (Limit: ${maxImages} images).`);
    }

    const filesToAdd = validFiles.slice(0, availableSlots);
    const previewsToAdd = validPreviews.slice(0, availableSlots);

    setImageFiles(prev => [...prev, ...filesToAdd]);
    setImagePreviews(prev => [...prev, ...previewsToAdd]);
    if (errors.images) {
      setErrors(prev => { const copy = { ...prev }; delete copy.images; return copy; });
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(e.target.files);
      e.target.value = "";
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files);
    }
  };

  const removeImage = (index: number) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="bg-white rounded-2xl border border-[#E5E5E5] p-6 space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-[#F5F5F5]">
        <div className="flex items-center gap-2">
          <Upload className="w-5 h-5 text-[#E8436E]" />
          <h2 className="text-lg font-bold text-[#171717]">Product Images</h2>
        </div>
        <span className="text-xs font-bold text-[#E8436E] bg-[#FFF0F3] px-3 py-1 rounded-full border border-[#E8436E]/20 flex items-center gap-1.5 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-[#E8436E] animate-pulse" />
          Up to {maxImages} Images Only
        </span>
      </div>
      <div>
        <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImageSelect} />
        <div 
          onClick={() => fileInputRef.current?.click()} 
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer ${
            isDragging 
              ? "border-[#E8436E] bg-[#FFF0F3] scale-[1.01] shadow-lg shadow-[#E8436E]/10" 
              : errors.images 
                ? "border-red-500 bg-red-50/5 hover:border-red-500" 
                : "border-[#E5E5E5] bg-[#FAFAFA] hover:border-[#E8436E] hover:bg-[#FFF0F3]/30"
          }`}
        >
          <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-sm border border-[#E5E5E5]">
            <Upload className={`w-6 h-6 ${isDragging ? "text-[#E8436E]" : errors.images ? "text-red-400" : "text-[#A3A3A3]"}`} />
          </div>
          <p className={`text-sm font-bold ${errors.images ? "text-red-500" : "text-[#171717]"}`}>
            {isDragging ? "Drop your images here now" : imagePreviews.length > 0 ? `${imagePreviews.length} image(s) selected` : "Drag & drop images here, or click to browse"}
          </p>
          <p className="text-xs font-semibold text-[#E8436E] mt-2 inline-block bg-[#FFF0F3] px-3 py-1 rounded-full border border-[#E8436E]/10">
            Supports PNG, JPG, WEBP • Upload limit: {maxImages} images max per product
          </p>
        </div>
        {errors.images && <p className="text-red-500 text-xs mt-2 font-semibold">{errors.images}</p>}
        
        <div className="flex items-center gap-2 mt-3 p-3 bg-amber-50 rounded-xl border border-amber-200/70 text-amber-900 text-xs font-medium">
          <Info className="w-4 h-4 text-amber-600 shrink-0" />
          <span><strong>Image Guide:</strong> You can upload up to <strong>{maxImages} high-quality images</strong> for this product. The first image will be set as the main display cover photo.</span>
        </div>
        
        {imagePreviews.length > 0 && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold text-[#737373] uppercase tracking-wider">Selected Images ({imagePreviews.length} / {maxImages})</p>
              {imagePreviews.length >= maxImages && (
                <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200">Max limit reached ({maxImages}/{maxImages})</span>
              )}
            </div>
            <div className="flex gap-3 flex-wrap">
              {imagePreviews.map((img, i) => (
                <div 
                  key={i} 
                  onClick={(e) => e.stopPropagation()} 
                  className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-[#E5E5E5] relative group shadow-sm bg-white shrink-0"
                >
                  <img src={img} alt={`Preview ${i + 1}`} className="w-full h-full object-cover" />
                  <button 
                    type="button" 
                    onClick={(e) => { e.stopPropagation(); removeImage(i); }} 
                    className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 shadow-md transition-colors cursor-pointer z-10"
                    title="Remove image"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                  {i === 0 && (
                    <span className="absolute bottom-1 left-1 bg-[#E8436E] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md shadow-sm">Primary</span>
                  )}
                </div>
              ))}
              {imagePreviews.length < maxImages && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-24 h-24 rounded-2xl border-2 border-dashed border-[#E5E5E5] hover:border-[#E8436E] flex flex-col items-center justify-center text-[#A3A3A3] hover:text-[#E8436E] transition-colors bg-[#FAFAFA] cursor-pointer"
                >
                  <Plus className="w-6 h-6 mb-1" />
                  <span className="text-[10px] font-bold">Add More</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
