"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Search, ShoppingCart, X, Package, Check } from "lucide-react";
import { Product } from "@/types/products";

interface Category {
  id: number;
  name: string;
}

interface ProductListProps {
  products?: Product[];
  onAddToCart: (product: Product) => void;
}

export default function ProductList({
  products,
  onAddToCart,
}: ProductListProps) {
  const [localProducts, setLocalProducts] = useState<Product[]>(products ?? []);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | "all">("all");
  const [search, setSearch] = useState("");
  const [addedId, setAddedId] = useState<number | null>(null);

  // Fetch produk jika tidak dikirim dari parent
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

  // Fetch categories untuk filter tabs
  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((data) => setCategories(data))
      .catch(() => setCategories([]));
  }, []);

  const handleAdd = (product: Product) => {
    if (product.stock <= 0) return;
    onAddToCart(product);
    setAddedId(product.id);
    setTimeout(() => setAddedId(null), 600);
  };

  // Filter produk berdasarkan kategori dan pencarian
  const filtered = localProducts.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.sku && p.sku.toLowerCase().includes(search.toLowerCase()));

    const matchesCategory =
      selectedCategory === "all" || p.categoryId === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Header & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <span>Katalog Produk</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold">
              {filtered.length} item
            </span>
          </h1>
          <p className="text-xs text-slate-400">Pilih produk untuk ditambahkan ke keranjang</p>
        </div>

        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Cari produk / SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 pl-9 pr-8 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-950 focus:bg-white transition"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Category Pills Slider */}
      {categories.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setSelectedCategory("all")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer select-none active:scale-[0.98] ${
              selectedCategory === "all"
                ? "bg-slate-900 text-white shadow-xs"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            Semua ({localProducts.length})
          </button>
          {categories.map((c) => {
            const count = localProducts.filter((p) => p.categoryId === c.id).length;
            return (
              <button
                key={c.id}
                onClick={() => setSelectedCategory(c.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer select-none active:scale-[0.98] ${
                  selectedCategory === c.id
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {c.name} {count > 0 && `(${count})`}
              </button>
            );
          })}
        </div>
      )}

      {/* Grid Produk */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3.5 overflow-y-auto">
        {filtered.map((product) => {
          const isOutOfStock = product.stock <= 0;
          const isLowStock = product.stock > 0 && product.stock <= 5;
          const isRecentlyAdded = addedId === product.id;

          return (
            <div
              key={product.id}
              onClick={() => handleAdd(product)}
              className={`group relative bg-white border rounded-2xl p-3 flex flex-col justify-between transition-all duration-150 select-none ${
                isOutOfStock
                  ? "opacity-60 border-slate-200 cursor-not-allowed"
                  : "border-slate-200/80 hover:border-indigo-300 hover:shadow-md cursor-pointer active:scale-[0.98]"
              }`}
            >
              {/* Gambar & Stock Badge */}
              <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-slate-100 mb-2.5">
                <Image
                  src={product.imageUrl || "/placeholder.png"}
                  alt={product.name}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                  unoptimized
                />

                {/* Stock Badge Overlay */}
                <div className="absolute top-2 left-2">
                  {isOutOfStock ? (
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-rose-600 text-white shadow-xs">
                      Habis
                    </span>
                  ) : isLowStock ? (
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-amber-500 text-white shadow-xs">
                      Sisa {product.stock}
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 text-[10px] font-medium rounded-md bg-slate-900/70 text-white backdrop-blur-xs">
                      Stok: {product.stock}
                    </span>
                  )}
                </div>

                {/* Added animation feedback */}
                {isRecentlyAdded && (
                  <div className="absolute inset-0 bg-emerald-600/90 backdrop-blur-xs flex items-center justify-center text-white font-bold text-xs gap-1 animate-in fade-in zoom-in-90 duration-150">
                    <Check size={16} />
                    <span>Ditambahkan!</span>
                  </div>
                )}
              </div>

              {/* Info Produk */}
              <div className="space-y-1">
                {product.sku && (
                  <p className="text-[10px] uppercase font-mono text-slate-400 truncate">
                    {product.sku}
                  </p>
                )}
                <h3 className="font-semibold text-sm text-slate-800 line-clamp-2 leading-tight group-hover:text-indigo-600 transition-colors">
                  {product.name}
                </h3>
              </div>

              {/* Harga & Tombol Aksi */}
              <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                <span className="font-bold text-sm sm:text-base text-slate-900">
                  Rp{Number(product.price).toLocaleString("id-ID")}
                </span>

                <button
                  type="button"
                  disabled={isOutOfStock}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAdd(product);
                  }}
                  className={`p-2 rounded-xl transition ${
                    isOutOfStock
                      ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                      : "bg-slate-900 text-white hover:bg-indigo-600 shadow-xs active:scale-95"
                  }`}
                  aria-label="Tambah ke keranjang"
                >
                  <ShoppingCart size={15} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {filtered.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center flex flex-col items-center justify-center">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
            <Package className="w-6 h-6" />
          </div>
          <p className="font-semibold text-slate-700">Tidak ada produk ditemukan</p>
          <p className="text-xs text-slate-400 mt-1 max-w-xs">
            Coba kata kunci lain atau pilih kategori yang berbeda
          </p>
          {search && (
            <button
              onClick={() => setSearch("")}
              className="mt-3 text-xs font-semibold text-indigo-600 hover:underline"
            >
              Reset Pencarian
            </button>
          )}
        </div>
      )}
    </div>
  );
}
