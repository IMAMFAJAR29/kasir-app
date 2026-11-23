import Image from "next/image";
import { Edit2, Barcode, Trash2, Package, Boxes } from "lucide-react";
import { ProductWithCategory } from "@/types/products";

interface ProductCardProps {
  product: ProductWithCategory;
  onEdit?: () => void;
  onPrintBarcode?: () => void;
  onDelete?: () => void;
  onConvertToBundle?: () => void;
}

export default function ProductCard({
  product,
  onEdit,
  onPrintBarcode,
  onDelete,
  onConvertToBundle,
}: ProductCardProps) {
  const isOutOfStock = product.stock <= 0;
  const isLowStock = product.stock > 0 && product.stock <= 5;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md hover:border-slate-300 transition-all duration-200 overflow-hidden flex flex-col justify-between group">
      <div>
        {/* Gambar & Stock Badge */}
        <div className="relative w-full aspect-4/3 bg-slate-100 overflow-hidden">
          {product.imageUrl ? (
            <Image
              src={product.imageUrl}
              alt={product.name}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              unoptimized
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 gap-1">
              <Package size={28} />
              <span className="text-xs">No image</span>
            </div>
          )}

          {/* Stock Badge Overlay */}
          <div className="absolute top-2.5 left-2.5">
            {isOutOfStock ? (
              <span className="px-2 py-0.5 text-xs font-bold rounded-md bg-rose-600 text-white shadow-xs">
                Habis
              </span>
            ) : isLowStock ? (
              <span className="px-2 py-0.5 text-xs font-bold rounded-md bg-amber-500 text-white shadow-xs">
                Sisa {product.stock}
              </span>
            ) : (
              <span className="px-2 py-0.5 text-xs font-medium rounded-md bg-slate-900/75 text-white backdrop-blur-xs">
                Stok: {product.stock}
              </span>
            )}
          </div>

          {/* Bundle Badge */}
          {product.isBundle && (
            <div className="absolute left-2.5 top-9">
              <span className="inline-flex items-center gap-1 rounded-md bg-indigo-600 px-2 py-0.5 text-xs font-semibold text-white shadow-xs">
                <Boxes size={12} />
                Bundle
              </span>
            </div>
          )}

          {/* Category Chip Overlay */}
          {product.category && (
            <div className="absolute top-2.5 right-2.5">
              <span className="px-2 py-0.5 text-xs font-semibold rounded-md bg-white/90 text-slate-700 backdrop-blur-xs shadow-xs">
                {product.category.name}
              </span>
            </div>
          )}
        </div>

        {/* Info Produk */}
        <div className="p-4 space-y-1.5">
          {product.sku && (
            <p className="text-xs uppercase font-mono tracking-wider text-slate-400">
              SKU: {product.sku}
            </p>
          )}
          <h3 className="font-semibold text-sm text-slate-900 line-clamp-1 group-hover:text-indigo-600 transition-colors">
            {product.name}
          </h3>
          <p className="text-base font-bold text-slate-900">
            Rp {Number(product.price).toLocaleString("id-ID")}
          </p>
          {product.isBundle && product.bundleComponents?.length ? (
            <p className="text-xs text-slate-400">
              {product.bundleComponents.length} komponen
            </p>
          ) : null}
        </div>
      </div>

      {/* Action Toolbar */}
      <div className="px-4 pb-4 pt-1 flex items-center gap-1.5 border-t border-slate-100">
        {onEdit && (
          <button
            type="button"
            onClick={onEdit}
            className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl transition cursor-pointer active:scale-95"
          >
            <Edit2 size={13} />
            <span>Edit</span>
          </button>
        )}

        {onConvertToBundle && !product.isBundle && (
          <button
            type="button"
            onClick={onConvertToBundle}
            title="Ubah jenis menjadi produk bundle"
            className="p-2 text-xs font-medium border border-slate-200 hover:bg-indigo-50 hover:text-indigo-600 text-slate-700 rounded-xl transition cursor-pointer active:scale-95"
          >
            <Boxes size={15} />
          </button>
        )}

        {onPrintBarcode && (
          <button
            type="button"
            onClick={onPrintBarcode}
            title="Cetak Barcode"
            className="p-2 text-xs font-medium border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl transition cursor-pointer active:scale-95"
          >
            <Barcode size={15} />
          </button>
        )}

        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            title="Hapus Produk"
            className="p-2 text-xs font-medium text-rose-500 hover:bg-rose-50 hover:text-rose-600 rounded-xl transition cursor-pointer active:scale-95"
          >
            <Trash2 size={15} />
          </button>
        )}
      </div>
    </div>
  );
}
