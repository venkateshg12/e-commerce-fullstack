import { ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProductImage } from "@/types";

type ProductGalleryProps = {
  images: ProductImage[];
  title: string;
  /** Index into the cover-first ordering below. Controlled by the page so picking a
   *  color can swap the photo. */
  activeIndex: number;
  onSelect: (index: number) => void;
};

// Cover image first, so the gallery opens on the same shot the grid card showed.
// Sorting is stable and never changes the count, so callers can index by position.
const orderImages = (images: ProductImage[]) =>
  [...images].sort((a, b) => Number(b?.isCover) - Number(a?.isCover));

const ProductGallery = ({
  images,
  title,
  activeIndex,
  onSelect,
}: ProductGalleryProps) => {
  const ordered = orderImages(images);

  if (!ordered.length) {
    return (
      <div className="gallery-stage gallery-empty">
        <ImageIcon className="size-10" />
      </div>
    );
  }

  const safeIndex = Math.min(Math.max(activeIndex, 0), ordered.length - 1);
  const activeImage = ordered[safeIndex];

  return (
    <div className="gallery-wrap">
      {ordered.length > 1 ? (
        <div className="gallery-thumbs">
          {ordered.map((image, index) => (
            <button
              key={image.publicId || image.url}
              type="button"
              aria-label={`View image ${index + 1} of ${ordered.length}`}
              aria-current={index === safeIndex}
              onClick={() => onSelect(index)}
              className={cn(
                "gallery-thumb",
                index === safeIndex && "gallery-thumb-active"
              )}
            >
              <img src={image.url} alt="" className="gallery-thumb-image" />
            </button>
          ))}
        </div>
      ) : null}

      <div className="gallery-stage">
        <img
          key={activeImage.url}
          src={activeImage.url}
          alt={title}
          className="gallery-stage-image"
        />
      </div>
    </div>
  );
};

export default ProductGallery;
