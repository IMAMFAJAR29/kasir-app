"use client";

import { useState, useEffect } from "react";
import { Search, Trash } from "lucide-react";
import Image from "next/image";
import Button from "@/components/Button";

interface Product {
  id: number;
  name: string;
  sku: string;
  stock: number;
  imageUrl?: string;
}

interface ProductSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  locationId?: number | null;
  onSelectProduct: (product: Product) => void;
  selectedProducts: Product[];
  onRemoveProduct: (id: number) => void;
}

export default function ProductSelectModal({
  isOpen,
  onClose,
  locationId,
  onSelectProduct,
  selectedProducts,
  onRemoveProduct,
}: ProductSelectModalProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!locationId) return;
    const fetchProducts = async () => {
      const res = await fetch(`/api/products?locationId=${locationId}`);
      const data = await res.json();
      setProducts(data);
    };
    fetchProducts();
  }, [locationId]);

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white w-[800px] max-h-[90vh] rounded-2xl shadow-xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center px-5 py-3 border-b">
          <h2 className="text-lg font-semibold">Pilih Produk</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-xl"
          >
            ✕
          </button>
        </div>

        {/* Search bar */}
        <div className="p-4 border-b">
          <div className="flex items-center gap-2 bg-gray-100 px-3 py-2 rounded-xl shadow-inner">
            <Search className="text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Cari nama produk atau SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent flex-1 outline-none"
            />
          </div>
        </div>

        {/* Product list */}
        <div className="p-4 overflow-y-auto flex-1">
          {locationId ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {filteredProducts.map((product) => (
                <div
                  key={product.id}
                  className="relative rounded-xl p-3 flex flex-col items-center text-center shadow-sm hover:shadow-md transition bg-white"
                >
                  {product.imageUrl ? (
                    <Image
                      src={product.imageUrl}
                      alt={product.name}
                      width={100}
                      height={100}
                      className="object-cover rounded-md mb-2"
                    />
                  ) : (
                    <div className="w-[100px] h-[100px] bg-gray-200 rounded-md mb-2 flex items-center justify-center text-gray-400 text-sm">
                      No Image
                    </div>
                  )}
                  <div className="text-sm font-semibold">{product.name}</div>
                  <div className="text-xs text-gray-500">
                    SKU: {product.sku}
                  </div>
                  <div className="text-xs text-gray-600 mt-1">
                    Stok: {product.stock}
                  </div>

                  {selectedProducts.some((p) => p.id === product.id) ? (
                    <button
                      onClick={() => onRemoveProduct(product.id)}
                      className="mt-2 flex items-center gap-1 text-red-500 hover:text-red-600 text-sm"
                    >
                      <Trash size={16} /> Hapus
                    </button>
                  ) : (
                    <Button
                      onClick={() => onSelectProduct(product)}
                      className="mt-2 px-3 py-1 text-sm rounded-xl"
                    >
                      Tambah
                    </Button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500 text-sm">
              Pilih gudang terlebih dahulu untuk menampilkan stok produk.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
