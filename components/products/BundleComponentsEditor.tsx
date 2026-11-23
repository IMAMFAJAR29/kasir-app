"use client";

import { useMemo, useState } from "react";
import { Minus, Plus, Trash2, Package } from "lucide-react";
import Button from "@/components/Button";
import ProductModal from "@/components/shared/ProductModal";
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
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState("");

  const componentById = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products]
  );

  // Komponen hanya boleh produk satuan dan bukan produk itu sendiri. Produk
  // yang sudah dipilih tetap tampil di modal dalam keadaan nonaktif.
  const selectableProducts = useMemo(
    () =>
      products.filter(
        (product) => !product.isBundle && product.id !== currentProductId
      ),
    [products, currentProductId]
  );

  const filteredProducts = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return selectableProducts;
    return selectableProducts.filter(
      (product) =>
        product.name.toLowerCase().includes(keyword) ||
        product.sku?.toLowerCase().includes(keyword)
    );
  }, [selectableProducts, search]);

  const addComponent = (product: ProductWithCategory) => {
    if (components.some((item) => item.componentProductId === product.id)) return;
    onChange([...components, { componentProductId: product.id, quantity: 1 }]);
    setShowModal(false);
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
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-slate-800">Komposisi Bundle</p>
          <p className="text-xs text-slate-500">
            Stok bundle dihitung otomatis dari stok komponen. Komponen tidak boleh
            berupa produk bundle lain.
          </p>
        </div>
        <Button
          type="button"
          variant="primary"
          size="sm"
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5"
        >
          <Plus size={15} /> Tambah Komponen
        </Button>
      </div>

      {components.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-slate-200 px-4 py-8 text-center">
          <Package size={22} className="text-slate-400" />
          <p className="text-sm font-medium text-slate-600">Belum ada komponen</p>
          <p className="text-xs text-slate-400">
            Tambahkan minimal satu produk satuan sebagai penyusun bundle.
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

      <ProductModal
        open={showModal}
        title="Pilih Produk Komponen"
        products={selectableProducts}
        filteredProducts={filteredProducts}
        onAddProduct={addComponent}
        onClose={() => {
          setShowModal(false);
          setSearch("");
        }}
        onSearch={setSearch}
        requireContext={false}
        disabledIds={components.map((item) => item.componentProductId)}
      />
    </div>
  );
}
