import { cn } from "@/lib/utils";
import { ImageIcon } from "lucide-react";
import { useState } from "react";

type LazyImageProps = Omit<React.ComponentProps<"img">, "src" | "loading" | "onLoad" | "onError"> & {
  src: string;
  // Above-the-fold images load immediately and ahead of everything else; the rest wait to scroll in.
  priority?: boolean;
};

/**
 * An <img> that holds a grey placeholder until it has loaded, then fades in, and shows an icon if
 * it can't be loaded at all. Sized entirely by the `className` the caller passes, so it drops in
 * where a plain <img> was.
 */
const LazyImage = ({ src, alt, className, priority = false, ...props }: LazyImageProps) => {
  // Remembered by src, so swapping the image (a gallery thumbnail) starts a fresh placeholder.
  const [loadedSrc, setLoadedSrc] = useState<string>();
  const [failedSrc, setFailedSrc] = useState<string>();

  if (failedSrc === src) {
    return (
      <div className={cn(className, "lazy-image-fallback")} role="img" aria-label={alt}>
        <ImageIcon className="h-8 w-8" />
      </div>
    );
  }

  return (
    <img
      {...props}
      src={src}
      alt={alt}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      fetchPriority={priority ? "high" : undefined}
      className={cn(className, loadedSrc === src ? "lazy-image-loaded" : "lazy-image-loading")}
      onLoad={() => setLoadedSrc(src)}
      onError={() => setFailedSrc(src)}
    />
  );
};

export default LazyImage;
