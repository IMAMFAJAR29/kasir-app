"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Search, ShoppingCart, X, Package, Check, Camera } from "lucide-react";
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
  const [scanMessage, setScanMessage] = useState<string>("");
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);
  const scannerRef = useRef<any>(null);
  const scannerDivId = "pos-barcode-reader";

  const tryScan = (value: string) => {
    const code = value.trim();
    if (!code) return false;
    const lower = code.toLowerCase();
    const match = localProducts.find(
      (p) =>
        (p.barcode && p.barcode.toLowerCase() === lower) ||
        (p.sku && p.sku.toLowerCase() === lower)
    );
    if (match && match.stock > 0) {
      onAddToCart(match);
      setAddedId(match.id);
      setTimeout(() => setAddedId(null), 600);
      setSearch("");
      setScanMessage("");
      // kembalikan fokus ke input scan
      setTimeout(() => inputRef.current?.focus(), 0);
      return true;
    }
    if (match && match.stock <= 0) {
      setScanMessage(`Stok produk "${match.name}" habis.`);
    } else {
      setScanMessage(`Produk dengan kode "${code}" tidak ditemukan.`);
    }
    setTimeout(() => setScanMessage(""), 3000);
    setTimeout(() => inputRef.current?.focus(), 0);
    return false;
  };

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

  // Camera barcode scanner
  useEffect(() => {
    if (!cameraOpen) return;
    let stopped = false;
    setCameraError("");
    (async () => {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        if (stopped) return;
        const scanner = new Html5Qrcode(scannerDivId);
        scannerRef.current = scanner;
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 240, height: 240 } },
          (decodedText: string) => {
            if (stopped) return;
            const found = tryScan(decodedText);
            if (found) {
              // stop after successful scan
              scanner.stop().then(() => scanner.clear()).catch(() => {});
              setCameraOpen(false);
            }
          },
          () => {
            // ignore per-frame errors
          }
        );
      } catch (err: any) {
        if (stopped) return;
        setCameraError(
          err?.message || "Gagal membuka kamera. Pastikan izin kamera diberikan."
        );
      }
    })();
    return () => {
      stopped = true;
      const s = scannerRef.current;
      if (s) {
        s.stop()
          .then(() => s.clear())
          .catch(() => {})
          .finally(() => {
            scannerRef.current = null;
          });
      }
    };
  }, [cameraOpen]);

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
      (p.sku && p.sku.toLowerCase().includes(search.toLowerCase())) ||
      (p.barcode && p.barcode.toLowerCase().includes(search.toLowerCase()));

    const matchesCategory =
      selectedCategory === "all" || p.categoryId === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="flex h-full flex-col space-y-3 sm:space-y-4">
      {/* Header & Search Bar */}
      <div className="flex flex-col justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white p-3 shadow-xs sm:p-4">
        <div>
          <h1 className="flex items-center gap-2 text-base font-bold text-slate-900 sm:text-lg">
            <span>Katalog Produk</span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600 sm:text-xs">
              {filtered.length} item
            </span>
          </h1>
          <p className="text-xs text-slate-400 sm:text-xs">
            Pilih produk untuk ditambahkan ke keranjang
          </p>
        </div>

        <div className="flex w-full items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Cari produk / SKU / scan barcode..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  const value = (e.currentTarget as HTMLInputElement).value;
                  const found = tryScan(value);
                  if (!found) {
                    // biarkan teks sebagai filter pencarian; jangan kosongkan
                  }
                }
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 pl-9 pr-8 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-950 focus:bg-white transition"
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
          <button
            type="button"
            onClick={() => setCameraOpen(true)}
            title="Scan barcode dengan kamera"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
          >
            <Camera size={18} />
          </button>
        </div>
        {scanMessage && (
          <p className="mt-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
            {scanMessage}
          </p>
        )}
      </div>

      {/* Category Pills Slider */}
      {categories.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setSelectedCategory("all")}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap transition cursor-pointer select-none active:scale-[0.98] sm:text-xs ${
              selectedCategory === "all"
                ? "bg-blue-600 text-white shadow-xs"
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
                className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap transition cursor-pointer select-none active:scale-[0.98] sm:text-xs ${
                  selectedCategory === c.id
                    ? "bg-blue-600 text-white shadow-xs"
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
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-4 xl:gap-3.5">
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
                    <span className="px-2 py-0.5 text-xs font-bold rounded-md bg-rose-600 text-white shadow-xs">
                      Habis
                    </span>
                  ) : isLowStock ? (
                    <span className="px-2 py-0.5 text-xs font-bold rounded-md bg-amber-500 text-white shadow-xs">
                      Sisa {product.stock}
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 text-xs font-medium rounded-md bg-slate-900/70 text-white backdrop-blur-xs">
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
                  <p className="text-xs uppercase font-mono text-slate-400 truncate">
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

      {/* Camera Scan Modal */}
      {cameraOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setCameraOpen(false);
          }}
        >
          <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <h3 className="text-sm font-bold text-slate-900">Scan Barcode</h3>
              <button
                type="button"
                onClick={() => setCameraOpen(false)}
                className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100"
                aria-label="Tutup scanner"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-4">
              <div
                id={scannerDivId}
                className="overflow-hidden rounded-xl bg-slate-100"
              />
              {cameraError && (
                <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
                  {cameraError}
                </p>
              )}
              <p className="mt-3 text-center text-xs text-slate-400">
                Arahkan kamera ke barcode produk. Scan akan otomatis menambahkan ke keranjang.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
