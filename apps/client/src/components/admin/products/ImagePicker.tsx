import { useState, useRef, type ChangeEvent,type DragEvent } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { AlertPopup } from "@/components/ui/alert-popup";
import type { LocalImage, Product, ProductImage } from "@/types/product.types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { COLOR_MAP } from "@/constants/constant";
import { useUploadProductImages } from "@/hooks/product/useUploadProductImages";
import { useDeleteProductImages } from "@/hooks/product/useDeleteProductImages";
import { useChangeProductCover } from "@/hooks/product/useChangeProductCover";
import { useSetProductImageColor } from "@/hooks/product/useSetProductImageColor";
import { useUpdateProduct } from "@/hooks/product/useUpdateProduct";
import { UploadCloud, Star, Trash2, Edit3, X, Loader2 } from "lucide-react";
import { LoadingDots } from "@/components/ui/loading-dots";

type ImagePickerProps = {
  product?: Product | null;
  localImages?: LocalImage[];
  onLocalImagesChange?: (images: LocalImage[]) => void;
  // The product's colour palette. A photo may only be tagged with one of these, which is what the
  // backend enforces and what lets the storefront match a photo to the colour a shopper picks.
  palette?: string[];
};

// Select needs a non-empty value, so "no colour" gets a sentinel rather than "".
const NO_COLOR = "__none__";

type AlertPopupState = {
  isOpen: boolean;
  type: "error" | "warning" | "success" | "info";
  title: string;
  description: string;
  autoCloseDuration?: number;
};

const MAX_FILE_SIZE_MB = 10;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

/**
 * A gallery photo that shimmers until the browser has actually painted it. Cloudinary URLs are
 * fetched over the network, so without this the tiles pop in one by one against empty cards.
 */
function GalleryImage({ src, className }: { src: string; className: string }) {
  const [loaded, setLoaded] = useState(false);

  return (
    <>
      {loaded ? null : <div className="shimmer-block absolute inset-0 z-10" />}
      <img
        src={src}
        alt="Product"
        className={className}
        // A cached image can finish loading before React attaches onLoad, and then the event
        // never fires — the ref catches that case by reading `complete` on mount.
        ref={(node) => {
          if (node?.complete) setLoaded(true);
        }}
        onLoad={() => setLoaded(true)}
        onError={() => setLoaded(true)}
      />
    </>
  );
}

const ImagePicker = ({
  product,
  localImages = [],
  onLocalImagesChange,
  palette = [],
}: ImagePickerProps) => {
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
  const imageColorMutation = useSetProductImageColor();
  const updateProductMutation = useUpdateProduct();

  const isUploading = uploadMutation.isPending;
  const isDeleting = deleteMutation.isPending;
  const isSettingCover = coverMutation.isPending;
  const isTaggingColor = imageColorMutation.isPending;
  const isSavingPalette = updateProductMutation.isPending;
  const isProcessing =
    isUploading || isDeleting || isSettingCover || isTaggingColor || isSavingPalette;

  const currentImages: ProductImage[] = product?.images ?? [];
  // The worker resizes and uploads in the background, so a just-sent photo isn't in the gallery
  // yet. A shimmering tile stands in its place until the poller reports the product READY.
  const isProcessingImages =
    product?.uploadStatus === "PENDING" || product?.uploadStatus === "PROCESSING";

  // Photos the product already had when this dialog opened. They stay first; every new upload
  // is inserted straight after them, so the newest upload leads the new photos (A, B, D, C).
  // The dialog content unmounts on close, so this is captured fresh on every open.
  const [initialPublicIds] = useState(
    () => new Set((product?.images ?? []).map((img) => img.publicId))
  );

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

    // Newest first: the last file picked in a batch leads that batch.
    const newestFirst = [...validFiles].reverse();

    if (!onLocalImagesChange) return;

    /*
      Files are staged rather than sent straight away, on an existing product as much as on a new
      one: the colour belongs to the photo, so it is picked here — while the file and its tile are
      still side by side — and travels with the file into the upload. Tagging afterwards, from the
      gallery, is what let a colour end up on the wrong photo.
     */
    // Newest first, so the latest pick is the first tile and (on a new product) the Main Cover.
    onLocalImagesChange([
      ...newestFirst.map((file) => ({ file } as LocalImage)),
      ...localImages,
    ]);
  };

  // Every staged photo needs a colour before it can be uploaded — an untagged photo is exactly the
  // mapping hole this staging step exists to close. A product with no palette has nothing to pick.
  const untaggedCount = palette.length
    ? localImages.filter((image) => !image.color).length
    : 0;

  // Sends the staged batch for a product that already exists. New products upload on create,
  // from the same list, in the dialog's submit.
  const uploadStagedImages = async () => {
    if (!product?._id || localImages.length === 0 || untaggedCount > 0) return;

    try {
      await savePaletteFirst();
    } catch (err) {
      const msg =
        (err as { message?: string } | null)?.message || "Failed to save the colour list.";
      triggerAlert("error", "Upload Failed", msg);
      return;
    }

    // Recomputed per upload, so the batch still lands right if an original photo was deleted
    // meanwhile: new photos go straight after the ones the dialog opened with.
    const position = currentImages.filter((img) => initialPublicIds.has(img.publicId)).length;

    uploadMutation.mutate(
      {
        productId: product._id,
        files: localImages.map((image) => image.file),
        // Index-aligned with `files` by construction — same array, same order.
        colors: localImages.map((image) => image.color ?? ""),
        position,
      },
      {
        onSuccess: () => {
          onLocalImagesChange?.([]);
          triggerAlert("success", "Images Uploaded", "The photos were added to this product.", 2000);
        },
        onError: (err) => {
          const msg = err?.message || "Failed to upload images.";
          triggerAlert("error", "Upload Failed", msg);
        },
      }
    );
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

  const setLocalImageColor = (index: number, color: string) => {
    if (!onLocalImagesChange) return;
    onLocalImagesChange(
      localImages.map((image, i) =>
        i === index ? { ...image, color: color === NO_COLOR ? undefined : color } : image
      )
    );
  };

  /*
    The server checks a photo's colour against the product's SAVED palette, but the picker offers
    the palette as it stands in the open dialog — so a colour added moments ago is offered and
    then rejected. Saving the colour list first closes that gap: by the time the tag or upload
    goes out, the colour it names exists on the product.
   */
  const savedColors = product?.colors ?? [];
  const hasUnsavedColors = palette.some((color) => !savedColors.includes(color));

  const savePaletteFirst = async () => {
    if (!product?._id || !hasUnsavedColors) return;
    await updateProductMutation.mutateAsync({
      productId: product._id,
      payload: { colors: palette },
    });
  };

  // Tags an already-uploaded photo. "" clears the colour server-side.
  const handleUploadedImageColor = async (publicId: string, color: string) => {
    if (!product?._id) return;

    try {
      await savePaletteFirst();
      await imageColorMutation.mutateAsync({
        productId: product._id,
        payload: { publicId, color: color === NO_COLOR ? "" : color },
      });
    } catch (err) {
      const msg =
        (err as { message?: string } | null)?.message ||
        "Failed to set the colour for this image.";
      triggerAlert("error", "Couldn't Tag Colour", msg);
    }
  };

  const removeLocalFile = (index: number) => {
    onLocalImagesChange?.(localImages.filter((_, i) => i !== index));
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
            {palette.length === 0 && (
              <span className="text-amber-600 dark:text-amber-400">Add colours above to tag photos</span>
            )}
          </div>

          {/* Tiles are 130px (128px photo + 2px border). Two rows + one gap + p-1 padding
              (keeps the cover/selected ring from clipping) = 280px (max-h-70); more scrolls. */}
          <div className="scrollbar-slim grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-70 overflow-y-auto p-1">
            {isProcessingImages ? (
              <div className="rounded-xl overflow-hidden border border-border bg-card shadow-xs">
                <div className="shimmer-block h-32 w-full" />
                <div className="border-t border-border/60 bg-muted/40 p-1">
                  <p className="px-2 py-1 text-[11px] text-muted-foreground font-poppins">
                    Processing...
                  </p>
                </div>
              </div>
            ) : null}

            {currentImages.map((img) => {
              const isSelected = selectedPublicIds.includes(img.publicId);
              // This tile is on its way out: via its own X, or as part of "Delete Selected".
              const isTileDeleting =
                deletingPublicId === img.publicId ||
                (isDeleting && deletingPublicId === null && isSelected);

              return (
                <div
                  key={img.publicId}
                  className={`group relative rounded-xl overflow-hidden border bg-card shadow-xs transition-all ${
                    img.isCover
                      ? "border-primary ring-2 ring-primary/20"
                      : isSelected
                      ? "border-destructive ring-2 ring-destructive/20"
                      : "border-slate-200 dark:border-slate-800 hover:border-slate-300"
                  } ${isTileDeleting ? "pointer-events-none" : ""}`}
                  aria-busy={isTileDeleting}
                >
                  {/* The photo and everything pinned to it get their own positioning context,
                      so the Cover badge sits on the image instead of over the colour bar below. */}
                  <div className="relative">
                    <GalleryImage
                      src={img.url}
                      className={`w-full h-32 object-cover transition duration-200 group-hover:scale-105 ${
                        isTileDeleting ? "opacity-40 grayscale" : ""
                      }`}
                    />

                    {/* Deleting: the photo fades and the progress sits on the photo itself,
                        instead of being squeezed inside the small X button. */}
                    {isTileDeleting && (
                      <div className="absolute inset-0 z-30 flex items-center justify-center bg-background/30 text-foreground">
                        <LoadingDots />
                      </div>
                    )}

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

                    {(isEditMode || isSelected) && !isTileDeleting && (
                      <button
                        type="button"
                        onClick={() => handleDeleteSingle(img.publicId)}
                        disabled={isProcessing}
                        title="Delete this image"
                        className="absolute top-2 right-2 z-20 w-6 h-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow-md hover:scale-110 active:scale-95 transition-transform cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Which colour this photo shows. Restricted to the product's palette so the
                      storefront can match a shopper's colour choice to a photo. */}
                  <div className="border-t border-border/60 bg-muted/40 p-1">
                    <Select
                      value={img.color ?? NO_COLOR}
                      disabled={isProcessing || palette.length === 0}
                      onValueChange={(value) => handleUploadedImageColor(img.publicId, value)}
                    >
                      <SelectTrigger size="sm" className="image-color-trigger">
                        <SelectValue placeholder="Colour" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NO_COLOR}>No colour</SelectItem>
                        {palette.map((color) => (
                          <SelectItem key={color} value={color}>
                            <span className="image-color-option">
                              <span
                                className="image-color-swatch"
                                style={{ backgroundColor: COLOR_MAP[color.toLowerCase()] || color }}
                              />
                              {color}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {localImages.length > 0 && (
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between gap-2">
            <Label className="font-poppins text-xs font-medium text-muted-foreground">
              Selected Files ({localImages.length})
            </Label>

            <div className="flex items-center gap-2">
              {untaggedCount > 0 && (
                <span className="text-xs text-amber-600 dark:text-amber-400 font-poppins">
                  Pick a colour for {untaggedCount} photo{untaggedCount > 1 ? "s" : ""}
                </span>
              )}

              {product?._id && (
                <Button
                  type="button"
                  size="sm"
                  onClick={uploadStagedImages}
                  disabled={isProcessing || untaggedCount > 0}
                  className="cursor-pointer font-poppins h-8 text-xs gap-1"
                >
                  {isUploading ? (
                    <LoadingDots />
                  ) : (
                    <>
                      <UploadCloud className="w-3.5 h-3.5" />
                      Upload {localImages.length} Photo{localImages.length > 1 ? "s" : ""}
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
          {/* Tiles are 158px (128px photo + 28px name bar + 2px border). Two rows + one gap
              + p-1 padding (keeps the cover ring from clipping) = 336px (max-h-84); more scrolls. */}
          <div className="scrollbar-slim grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-84 overflow-y-auto p-1">
            {localImages.map(({ file, color }, idx) => {
              const previewUrl = URL.createObjectURL(file);
              return (
                <div key={idx} className={`rounded-md overflow-hidden border bg-card shadow-lg ${!product?._id && idx === 0 ? "border-primary ring-2 ring-primary/20" : "border-slate-200"}`}>
                  {/* Own positioning context, so the badge and remove button sit on the image
                      rather than on the filename bar below it. */}
                  <div className="relative">
                    <img src={previewUrl} alt={file.name} className="w-full h-32 object-cover" />
                    {!product?._id && idx === 0 && (
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
                  </div>
                  <p className="h-7 px-1.5 leading-7 text-[11px] font-mono font-semibold truncate text-muted-foreground bg-muted/80">
                    {file.name} 
                  </p>

                  {/* The colour travels with this file into the upload, so it can't be applied to
                      the wrong photo. */}
                  <div className="border-t border-border/60 bg-muted/40 p-1">
                    <Select
                      value={color ?? NO_COLOR}
                      disabled={palette.length === 0}
                      onValueChange={(value) => setLocalImageColor(idx, value)}
                    >
                      <SelectTrigger size="sm" className="image-color-trigger">
                        <SelectValue placeholder="Colour" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NO_COLOR}>No colour</SelectItem>
                        {palette.map((paletteColor) => (
                          <SelectItem key={paletteColor} value={paletteColor}>
                            <span className="image-color-option">
                              <span
                                className="image-color-swatch"
                                style={{ backgroundColor: COLOR_MAP[paletteColor.toLowerCase()] || paletteColor }}
                              />
                              {paletteColor}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
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
