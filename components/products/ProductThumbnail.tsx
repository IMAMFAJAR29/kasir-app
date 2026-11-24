import Image from "next/image";
import { Package } from "lucide-react";

interface ProductThumbnailProps {
  src?: string | null;
  alt: string;
  /** Ukuran sisi dalam piksel. Default 40. */
  size?: number;
  className?: string;
}

/**
 * Thumbnail produk dengan placeholder konsisten.
 * Dipakai di Katalog, Stok Produk, dan Minimum Stok agar tampilan seragam.
 */
export default function ProductThumbnail({
  src,
  alt,
  size = 40,
  className = "",
}: ProductThumbnailProps) {
  return (
    <div
      className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-100 ${className}`}
      style={{ width: size, height: size }}
    >
      {src ? (
        <Image
          src={src}
          alt={alt}
          width={size}
          height={size}
          unoptimized
          className="h-full w-full object-cover"
        />
      ) : (
        <Package className="h-4 w-4 text-slate-400" />
      )}
    </div>
  );
}
