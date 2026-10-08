"use client";

import { Trash } from "lucide-react";

interface PurchaseItem {
  id: number;
  name: string;
  qty: number;
  price: number;
  subtotal: number;
}

interface PurchasePreviewProps {
  items: PurchaseItem[];
  removeItem: (id: number) => void;
}

export default function PurchasePreview({
  items,
  removeItem,
}: PurchasePreviewProps) {
  const subtotal = items.reduce((sum, i) => sum + i.subtotal, 0);

  const formatRupiah = (value: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
    }).format(value);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200">
      <div className="overflow-x-auto">
        <div className="grid min-w-[580px] grid-cols-[2fr_0.7fr_1.2fr_1.2fr_auto] gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold text-slate-600">
          <span>Nama Produk</span>
          <span className="text-center">Qty</span>
          <span className="text-right">Harga/unit</span>
          <span className="text-right">Subtotal</span>
          <span></span>
        </div>

        {items.length === 0 ? (
          <p className="min-w-[580px] py-6 text-center text-sm text-slate-500">
            Belum ada produk
          </p>
        ) : (
          <div className="divide-y divide-slate-100">
            {items.map((item) => (
              <div
                key={item.id}
                className="grid min-w-[580px] grid-cols-[2fr_0.7fr_1.2fr_1.2fr_auto] items-center gap-3 px-4 py-3 text-sm text-slate-700"
              >
                <span>{item.name}</span>
                <span className="text-center">{item.qty}</span>
                <span className="text-right">{formatRupiah(item.price)}</span>
                <span className="text-right">{formatRupiah(item.subtotal)}</span>
                <button
                  type="button"
                  onClick={() => removeItem(item.id)}
                  aria-label={`Hapus ${item.name}`}
                  className="rounded-lg p-2 text-rose-500 transition hover:bg-rose-50 hover:text-rose-700"
                >
                  <Trash size={18} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Subtotal */}
      <div className="border-t border-slate-100 bg-slate-50/70 p-3 text-right text-sm font-semibold text-slate-800">
        Total: {formatRupiah(subtotal)}
      </div>
    </div>
  );
}
