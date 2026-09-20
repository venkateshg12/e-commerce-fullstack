import { useState, useRef, type ChangeEvent,type DragEvent } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { AlertPopup } from "@/components/ui/alert-popup";
import type { Product, ProductImage } from "@/types/product.types";
import { useUploadProductImages } from "@/hooks/product/useUploadProductImages";
import { useDeleteProductImages } from "@/hooks/product/useDeleteProductImages";
import { useChangeProductCover } from "@/hooks/product/useChangeProductCover";
import { UploadCloud, Star, Trash2, Edit3, X, Loader2 } from "lucide-react";
import { LoadingDots } from "@/components/ui/loading-dots";

type ImagePickerProps = {
  product?: Product | null;
  localFiles?: File[];
  onLocalFilesChange?: (files: File[]) => void;
};

type AlertPopupState = {
  isOpen: boolean;
  type: "error" | "warning" | "success" | "info";
  title: string;
  description: string;
  autoCloseDuration?: number;
};

const MAX_FILE_SIZE_MB = 10;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

const ImagePicker = ({ product, localFiles = [], onLocalFilesChange }: ImagePickerProps) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedPublicIds, setSelectedPublicIds] = useState<string[]>([]);
  // Which single tile is being deleted, so only that X shows the pending dots.
  const [deletingPublicId, setDeletingPublicId] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [alertPopup, setAlertPopup] = useState<AlertPopupState | null>(null);

  const uploadMutation = useUploadProductImages();
  const deleteMutation = useDeleteProductImages();
  const coverMutation = useChangeProductCover();

  const isUploading = uploadMutation.isPending;
  const isDeleting = deleteMutation.isPending;
  const isSettingCover = coverMutation.isPending;
  const isProcessing = isUploading || isDeleting || isSettingCover;

  const currentImages: ProductImage[] = product?.images ?? [];

  const triggerAlert = (
    type: "error" | "warning" | "success" | "info",
    title: string,
    description: string,
    autoCloseDuration?: number
  ) => {
    setAlertPopup({
      isOpen: true,
      type,
      title,
      description,
      autoCloseDuration,
    });
  };

  const validateFiles = (files: File[]): File[] => {
    const valid: File[] = [];

    for (const file of files) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        const msg = `"${file.name}" is not a supported format (JPEG, PNG, WEBP, GIF only).`;
        triggerAlert("error", "Invalid File Format", msg);
        continue;
      }
      if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        const msg = `"${file.name}" exceeds the maximum allowed size of ${MAX_FILE_SIZE_MB}MB.`;
        triggerAlert("error", "File Exceeds Limit", msg);
        continue;
      }
      valid.push(file);
    }
    return valid;
  };

  const handleFilesAdded = (files: File[]) => {
    const validFiles = validateFiles(files);
    if (validFiles.length === 0) return;

    if (product?._id) {
      uploadMutation.mutate(
        { productId: product._id, files: validFiles },
        {
          onError: (err: any) => {
            const msg = err?.response?.data?.message || "Failed to upload images.";
            triggerAlert("error", "Upload Failed", msg);
          },
        }
      );
    } else if (onLocalFilesChange) {
      // Append, never prepend. Prepending inverted the admin's chosen order and made the
      // LAST batch's first photo the cover.
      onLocalFilesChange([...localFiles, ...validFiles]);
    }
  };

  const addFiles = (files: FileList | File[] | null) => {
    if (!files) return;
    const fileArray = Array.isArray(files) ? files : Array.from(files);
    if (fileArray.length === 0) return;
    handleFilesAdded(fileArray);
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(e.target.files);
      e.target.value = "";
    }
  };

  const handleDrag = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilesAdded(Array.from(e.dataTransfer.files));
    }
  };

  const handleDeleteSingle = (publicId: string) => {
    if (!product?._id) return;

    if (currentImages.length <= 1) {
      const msg = "Cannot delete all images. A product must have at least 1 image remaining.";
      triggerAlert("warning", "Deletion Restricted", msg);
      return;
    }

    setDeletingPublicId(publicId);

    deleteMutation.mutate(
      { productId: product._id, payload: { publicIds: [publicId] } },
      {
        onSettled: () => setDeletingPublicId(null),
        onSuccess: () => {
          setSelectedPublicIds((prev) => prev.filter((id) => id !== publicId));
          triggerAlert(
            "success",
            "Image Deleted",
            "The image has been removed from this product.",
            2000
          );
        },
        onError: (err: any) => {
          const msg = err?.response?.data?.message || "Failed to delete image.";
          triggerAlert("error", "Delete Failed", msg);
        },
      }
    );
  };

  const handleDeleteSelected = () => {
    if (!product?._id || selectedPublicIds.length === 0) return;

    if (currentImages.length - selectedPublicIds.length < 1) {
      const msg = "Cannot delete all images. At least 1 image must remain on the product.";
      triggerAlert("warning", "Deletion Restricted", msg);
      return;
    }

    const count = selectedPublicIds.length;

    deleteMutation.mutate(
      { productId: product._id, payload: { publicIds: selectedPublicIds } },
      {
        onSuccess: () => {
          setSelectedPublicIds([]);
          triggerAlert(
            "success",
            count > 1 ? "Images Deleted" : "Image Deleted",
            `${count} image${count > 1 ? "s" : ""} removed from this product.`,
            2000
          );
        },
        onError: (err: any) => {
          const msg = err?.response?.data?.message || "Failed to delete selected images.";
          triggerAlert("error", "Delete Failed", msg);
        },
      }
    );
  };

  const handleSetCover = (publicId: string) => {
    if (!product?._id) return;

    coverMutation.mutate(
      { productId: product._id, payload: { publicId } },
      {
        onError: (err: any) => {
          const msg = err?.response?.data?.message || "Failed to set cover image.";
          triggerAlert("error", "Cover Update Failed", msg);
        },
      }
    );
  };

  const toggleSelectImage = (publicId: string) => {
    setSelectedPublicIds((prev) =>
      prev.includes(publicId) ? prev.filter((id) => id !== publicId) : [...prev, publicId]
    );
  };

  const removeLocalFile = (index: number) => {
    if (onLocalFilesChange) {
      onLocalFilesChange(localFiles.filter((_, i) => i !== index));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Label className="font-poppins text-sm font-semibold">Product Images</Label>
          <p className="text-xs text-muted-foreground font-poppins">
            Upload product photos (JPEG, PNG, WEBP max 10MB). Set cover image & manage gallery.
          </p>
        </div>

        {product?._id && currentImages.length > 0 && (
          <div className="flex items-center gap-2">
            {selectedPublicIds.length > 0 && (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={handleDeleteSelected}
                disabled={isProcessing}
                className="cursor-pointer font-poppins h-8 text-xs gap-1"
              >
                {isDeleting ? (
                  <LoadingDots />
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete Selected ({selectedPublicIds.length})
                  </>
                )}
              </Button>
            )}

            <Button
              type="button"
              variant={isEditMode ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setIsEditMode(!isEditMode);
                setSelectedPublicIds([]);
              }}
              className="cursor-pointer font-poppins h-8 text-xs gap-1"
            >
              <Edit3 className="w-3.5 h-3.5" />
              {isEditMode ? "Done Editing" : "Edit Images"}
            </Button>
          </div>
        )}
      </div>



      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative flex flex-col items-center justify-center p-6 rounded-xl border-2 border-dashed transition-all cursor-pointer ${
          dragActive
            ? "border-primary bg-primary/5"
            : "border-slate-300 dark:border-slate-700 bg-muted/30 hover:bg-muted/50 hover:border-primary/50"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={handleInputChange}
          className="hidden"
        />

        {isUploading ? (
          <div className="flex flex-col items-center gap-2 text-primary font-poppins py-2">
            <Loader2 className="w-8 h-8 animate-spin" />
            <p className="text-sm font-medium">Uploading & processing images...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center text-center gap-1.5 font-poppins">
            <div className="p-3 rounded-full bg-background shadow-xs border border-slate-200 dark:border-slate-800">
              <UploadCloud className="w-6 h-6 text-primary" />
            </div>
            <p className="text-sm font-medium text-foreground">
              Click to upload or drag & drop files here
            </p>
            <p className="text-xs text-muted-foreground">
              Supports JPEG, PNG, WEBP up to 10MB each
            </p>
          </div>
        )}
      </div>

      {product?._id && currentImages.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground font-poppins">
            <span>
              {currentImages.length} {currentImages.length === 1 ? "Image" : "Images"} in Gallery
            </span>
            {isEditMode && <span className="text-primary">Click 'X' badge on an image to auto-delete</span>}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {currentImages.map((img) => {
              const isSelected = selectedPublicIds.includes(img.publicId);

              return (
                <div
                  key={img.publicId}
                  className={`group relative rounded-xl overflow-hidden border bg-card shadow-xs transition-all ${
                    img.isCover
                      ? "border-primary ring-2 ring-primary/20"
                      : isSelected
                      ? "border-destructive ring-2 ring-destructive/20"
                      : "border-slate-200 dark:border-slate-800 hover:border-slate-300"
                  }`}
                >
                  <img
                    src={img.url}
                    alt="Product"
                    className="w-full h-32 object-cover transition-transform duration-200 group-hover:scale-105"
                  />

                  <div className="absolute top-2 left-2 z-10">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelectImage(img.publicId)}
                      className="w-4 h-4 rounded-md accent-primary cursor-pointer shadow-xs"
                    />
                  </div>

                  <div className="absolute bottom-2 left-2 z-10">
                    {img.isCover ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary text-primary-foreground shadow-xs font-poppins">
                        <Star className="w-3 h-3 fill-current" />
                        Cover
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSetCover(img.publicId)}
                        disabled={isProcessing}
                        className="opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-black/60 text-white hover:bg-black/80 shadow-xs cursor-pointer font-poppins"
                      >
                        <Star className="w-3 h-3" />
                        Make Cover
                      </button>
                    )}
                  </div>

                  {(isEditMode || isSelected) && (
                    <button
                      type="button"
                      onClick={() => handleDeleteSingle(img.publicId)}
                      disabled={isProcessing}
                      title="Delete this image"
                      className="absolute top-2 right-2 z-20 w-6 h-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow-md hover:scale-110 active:scale-95 transition-transform cursor-pointer"
                    >
                      {deletingPublicId === img.publicId ? (
                        <LoadingDots />
                      ) : (
                        <X className="w-3.5 h-3.5" />
                      )}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!product?._id && localFiles.length > 0 && (
        <div className="space-y-2 pt-2">
          <Label className="font-poppins text-xs font-medium text-muted-foreground">
            Selected Files ({localFiles.length})
          </Label>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {localFiles.map((file, idx) => {
              const previewUrl = URL.createObjectURL(file);
              return (
                <div key={idx} className={`relative rounded-md overflow-hidden border bg-card shadow-lg ${idx === 0 ? "border-primary ring-2 ring-primary/20" : "border-slate-200"}`}>
                  <img src={previewUrl} alt={file.name} className="w-full h-32 object-cover" />
                  {idx === 0 && (
                    <span className="absolute top-2 left-2 z-10 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary text-primary-foreground shadow-xs font-poppins">
                      <Star className="w-3 h-3 fill-current" />
                      Main Cover
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => removeLocalFile(idx)}
                    className="absolute top-2 right-2 z-10 w-6 h-6 rounded-full bg-black/70 text-white hover:bg-destructive flex items-center justify-center cursor-pointer transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                  <p className="p-1.5 text-[11px] font-mono font-semibold truncate text-muted-foreground bg-muted/80">
                    {file.name} 
                  </p>

                </div>
              );
            })}
          </div>
        </div>
      )}

      {alertPopup && (
        <AlertPopup
          isOpen={alertPopup.isOpen}
          type={alertPopup.type}
          title={alertPopup.title}
          description={alertPopup.description}
          onClose={() => setAlertPopup(null)}
          autoCloseDuration={alertPopup.autoCloseDuration}
        />
      )}
    </div>
  );
};

export default ImagePicker;
