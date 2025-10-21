"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Search, ShoppingCart } from "lucide-react";
import Button from "@/components/Button";
import { Product } from "@/types/products";

interface ProductListProps {
  products?: Product[]; // opsional: parent bisa kirim data produk
  onAddToCart: (product: Product) => void;
}

export default function ProductList({
  products,
  onAddToCart,
}: ProductListProps) {
  // simpan produk dari props atau hasil fetch
  const [localProducts, setLocalProducts] = useState<Product[]>(products ?? []);
  const [search, setSearch] = useState("");

  // fetch produk hanya jika tidak dikirim dari parent
  useEffect(() => {
    if (products) {
      setLocalProducts(products);
      return;
    }

    const fetchProducts = async () => {
      try {
        const res = await fetch("/api/products");
        const data: Product[] = await res.json();
        setLocalProducts(data);
      } catch (err) {
        console.error("Gagal memuat produk:", err);
      }
    };

    fetchProducts();
  }, [products]);

  // filter produk berdasarkan nama
  const filtered = localProducts.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header dan input pencarian */}
      <div className="flex items-center mb-4">
        <h1 className="text-xl font-bold">Daftar Produk</h1>
        <div className="flex-grow mx-4 max-w-md relative">
          <input
            type="text"
            placeholder="Cari produk..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 pl-10 focus:outline-none transition duration-200 
             hover:shadow-md focus:shadow-lg focus:shadow-black/40"
          />
          <Search className="absolute left-3 top-2.5 text-gray-400 w-5 h-5" />
        </div>
      </div>

      {/* Daftar produk */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 overflow-y-auto">
        {filtered.map((product) => (
          <div
            key={product.id}
            className="rounded-2xl shadow-md hover:shadow-lg transition p-4 flex flex-col items-center text-center bg-white"
          >
            {/* Gambar produk */}
            <div className="relative w-full h-40 mb-3">
              <Image
                src={product.imageUrl || "/placeholder.png"}
                alt={product.name}
                fill
                className="object-cover rounded-lg"
                unoptimized
              />
            </div>

            {/* Nama & harga produk */}
            <div className="flex flex-col items-center">
              <h2 className="font-semibold text-sm text-black mb-1 line-clamp-1">
                {product.name}
              </h2>
              <p className="font-bold text-black text-base mb-3">
                Rp{product.price.toLocaleString("id-ID")}
              </p>

              <Button
                onClick={() => onAddToCart(product)}
                className="w-full flex items-center justify-center gap-2 text-sm"
              >
                <ShoppingCart className="w-4 h-4" />
                Tambah
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Jika tidak ada hasil */}
      {filtered.length === 0 && (
        <div className="text-center text-gray-500 mt-10">
          Tidak ada produk yang cocok.
        </div>
      )}
    </div>
  );
}
