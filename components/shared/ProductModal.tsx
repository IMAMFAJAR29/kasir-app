"use client";
import { X, Search } from "lucide-react";
import Image from "next/image";

interface ProductModalProps {
  open: boolean;
  products: any[];
  filteredProducts: any[];
  customerId?: number | null;
  locationId?: number | null;
  onAddProduct: (p: any) => void;
  onClose: () => void;
  onSearch: (q: string) => void;
  /** Judul modal. Default "Pilih Produk". */
  title?: string;
  /**
   * Jika true (default), modal hanya menampilkan produk setelah pelanggan &
   * gudang dipilih (dipakai Pembelian/Faktur). Set false untuk pemakaian yang
   * tidak butuh konteks tersebut, mis. memilih komponen bundle.
   */
  requireContext?: boolean;
  /** ID produk yang sudah dipilih; kartunya tetap tampil tapi tidak bisa diklik. */
  disabledIds?: number[];
  /** Pesan saat konteks belum lengkap. */
  contextHint?: string;
}

export default function ProductModal({
  open,
  products,
  filteredProducts,
  customerId,
  locationId,
  onAddProduct,
  onClose,
  onSearch,
  title = "Pilih Produk",
  requireContext = true,
  disabledIds = [],
  contextHint = "Pilih Pelanggan dan Gudang terlebih dahulu untuk menampilkan produk.",
}: ProductModalProps) {
  if (!open) return null;

  const contextReady =
    !requireContext || (Boolean(customerId) && Boolean(locationId));
  const disabled = new Set(disabledIds);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[70]">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl p-6 relative max-h-[80vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-500 hover:text-black"
        >
          <X size={20} />
        </button>
        <h3 className="text-lg font-semibold mb-4">{title}</h3>

        <div className="flex items-center gap-2 mb-4">
          <Search size={18} />
          <input
            type="text"
            placeholder="Cari nama produk atau SKU..."
            className="flex-1 rounded-xl px-3 py-2 shadow-sm focus:shadow-md outline-none"
            onChange={(e) => onSearch(e.target.value)}
            disabled={!contextReady}
          />
        </div>

        {!contextReady ? (
          <p className="text-center text-gray-500 mt-8">{contextHint}</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {filteredProducts.length === 0 && (
              <p className="col-span-full text-center text-gray-500 mt-8">
                Tidak ada produk yang cocok.
              </p>
            )}
            {filteredProducts.map((p) => {
              const isDisabled = disabled.has(p.id);
              return (
                <div
                  key={p.id}
                  onClick={() => {
                    if (!isDisabled) onAddProduct(p);
                  }}
                  className={`rounded-xl shadow-sm p-3 transition ${
                    isDisabled
                      ? "cursor-not-allowed opacity-50"
                      : "cursor-pointer hover:shadow-md"
                  }`}
                >
                  {p.imageUrl ? (
                    <Image
                      src={p.imageUrl}
                      alt={p.name}
                      width={200}
                      height={200}
                      className="h-24 w-full object-cover rounded-md mb-2"
                    />
                  ) : (
                    <div className="h-24 w-full bg-gray-200 rounded-md mb-2 flex items-center justify-center text-gray-400 text-sm">
                      No Image
                    </div>
                  )}
                  <h4 className="font-semibold text-sm">{p.name}</h4>
                  <p className="text-xs text-gray-500">SKU: {p.sku}</p>
                  <p className="text-xs text-gray-500">
                    Stok: {p.stock}
                    {p.isBundle && (
                      <span className="ml-1.5 rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-indigo-700">
                        Bundle
                      </span>
                    )}
                    {isDisabled && (
                      <span className="ml-1.5 text-[10px] font-semibold uppercase text-slate-400">
                        Sudah dipilih
                      </span>
                    )}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
