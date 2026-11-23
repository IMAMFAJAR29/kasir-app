"use client";

import { useMemo, useState } from "react";
import { Minus, Plus, Search, Trash2, Package } from "lucide-react";
import { BundleComponent, ProductWithCategory } from "@/types/products";

interface BundleComponentsEditorProps {
  components: BundleComponent[];
  onChange: (components: BundleComponent[]) => void;
  products: ProductWithCategory[];
  /** ID produk yang sedang diedit, agar tidak bisa menjadi komponen dirinya sendiri. */
  currentProductId?: number;
}

export default function BundleComponentsEditor({
  components,
  onChange,
  products,
  currentProductId,
}: BundleComponentsEditorProps) {
  const [search, setSearch] = useState("");

  const componentById = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products]
  );

  const candidates = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return [];
    return products
      .filter((product) => !product.isBundle)
      .filter((product) => product.id !== currentProductId)
      .filter(
        (product) =>
          product.name.toLowerCase().includes(keyword) ||
          product.sku?.toLowerCase().includes(keyword)
      )
      .slice(0, 8);
  }, [products, search, currentProductId]);

  const addComponent = (product: ProductWithCategory) => {
    if (components.some((item) => item.componentProductId === product.id)) {
      setSearch("");
      return;
    }
    onChange([...components, { componentProductId: product.id, quantity: 1 }]);
    setSearch("");
  };

  const updateQuantity = (productId: number, quantity: number) => {
    onChange(
      components.map((item) =>
        item.componentProductId === productId
          ? { ...item, quantity: Math.max(1, Math.floor(quantity) || 1) }
          : item
      )
    );
  };

  const removeComponent = (productId: number) => {
    onChange(components.filter((item) => item.componentProductId !== productId));
  };

  return (
    <div className="col-span-1 space-y-3 rounded-2xl border border-slate-200 bg-slate-50/60 p-4 sm:col-span-2">
      <div>
        <p className="text-sm font-semibold text-slate-800">Komposisi Bundle</p>
        <p className="text-xs text-slate-500">
          Stok bundle dihitung otomatis dari stok komponen. Komponen tidak boleh
          berupa produk bundle lain.
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Cari produk komponen (nama / SKU)..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="form-control pl-9"
        />
        {candidates.length > 0 && (
          <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
            {candidates.map((product) => (
              <button
                key={product.id}
                type="button"
                onClick={() => addComponent(product)}
                className="flex w-full items-center justify-between gap-3 px-3.5 py-2 text-left text-sm transition hover:bg-slate-50"
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium text-slate-800">
                    {product.name}
                  </span>
                  <span className="block truncate text-xs text-slate-400">
                    {product.sku} &bull; stok {product.stock}
                  </span>
                </span>
                <Plus size={15} className="shrink-0 text-slate-500" />
              </button>
            ))}
          </div>
        )}
      </div>

      {components.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-slate-200 px-4 py-8 text-center">
          <Package size={22} className="text-slate-400" />
          <p className="text-sm font-medium text-slate-600">Belum ada komponen</p>
          <p className="text-xs text-slate-400">
            Cari dan tambahkan minimal satu produk komponen.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {components.map((component) => {
            const product = componentById.get(component.componentProductId);
            return (
              <div
                key={component.componentProductId}
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-800">
                    {product?.name ?? `Produk #${component.componentProductId}`}
                  </p>
                  <p className="truncate text-xs text-slate-400">
                    {product?.sku ?? "-"}
                    {product ? ` \u00b7 stok ${product.stock}` : ""}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <div className="flex items-center overflow-hidden rounded-xl border border-slate-200 bg-white">
                    <button
                      type="button"
                      onClick={() =>
                        updateQuantity(
                          component.componentProductId,
                          component.quantity - 1
                        )
                      }
                      disabled={component.quantity <= 1}
                      className="flex h-7 w-7 items-center justify-center text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30"
                      aria-label="Kurangi jumlah"
                    >
                      <Minus size={13} />
                    </button>
                    <span className="w-8 select-none text-center text-xs font-bold text-slate-900">
                      {component.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        updateQuantity(
                          component.componentProductId,
                          component.quantity + 1
                        )
                      }
                      className="flex h-7 w-7 items-center justify-center text-slate-600 transition hover:bg-slate-100"
                      aria-label="Tambah jumlah"
                    >
                      <Plus size={13} />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeComponent(component.componentProductId)}
                    className="flex h-7 w-7 items-center justify-center rounded-xl text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                    title="Hapus komponen"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
