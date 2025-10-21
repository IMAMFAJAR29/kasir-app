import Image from "next/image";
import { Eye, Barcode, Trash2 } from "lucide-react";
import { ProductWithCategory } from "@/types/products"; 

// Props untuk komponen kartu produk
interface ProductCardProps {
  product: ProductWithCategory;
  onEdit?: () => void;
  onPrintBarcode?: () => void;
  onDelete?: () => void;
}

export default function ProductCard({
  product,
  onEdit,
  onPrintBarcode,
  onDelete,
}: ProductCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-md hover:shadow-lg overflow-hidden transition">
      {/* Gambar produk */}
      {product.imageUrl && (
        <div className="relative w-full h-40">
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            className="object-contain p-1"
          />
        </div>
      )}

      <div className="p-3 flex flex-col justify-between h-[180px]">
        {/* Info produk */}
        <div>
          <h3 className="font-semibold text-base truncate">{product.name}</h3>
          <p className="text-gray-700 dark:text-gray-200 font-medium mt-1 text-sm">
            Rp {product.price.toLocaleString()}
          </p>

          {/* Nama kategori (jika ada) */}
          {product.category && (
            <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">
              Kategori: {product.category.name}
            </p>
          )}
        </div>

        {/* Tombol aksi */}
        <div className="flex gap-2 mt-3">
          {onEdit && (
            <button
              onClick={onEdit}
              className="flex-1 flex items-center justify-center gap-1 px-2 py-1 text-sm bg-black text-white rounded hover:bg-gray-800"
            >
              <Eye size={14} /> Lihat / Edit
            </button>
          )}

          {onPrintBarcode && (
            <button
              onClick={onPrintBarcode}
              className="flex-1 flex items-center justify-center gap-1 px-2 py-1 text-sm bg-white text-black border border-gray-300 rounded hover:bg-gray-100"
            >
              <Barcode size={14} /> Barcode
            </button>
          )}

          {onDelete && (
            <button
              onClick={onDelete}
              className="flex-1 flex items-center justify-center gap-1 px-2 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
            >
              <Trash2 size={14} /> Hapus
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
