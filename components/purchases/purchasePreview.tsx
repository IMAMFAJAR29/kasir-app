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
    <div className="border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-2 px-3 py-2 font-semibold bg-gray-100">
        <span>Nama Produk</span>
        <span className="text-center">Qty</span>
        <span className="text-right">Harga/unit</span>
        <span className="text-right">Subtotal</span>
        <span></span>
      </div>

      {/* List Produk */}
      {items.length === 0 ? (
        <p className="text-center text-gray-500 py-4">Belum ada produk</p>
      ) : (
        <div className="divide-y">
          {items.map((item) => (
            <div
              key={item.id}
              className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-2 items-center px-3 py-2"
            >
              <span>{item.name}</span>
              <span className="text-center">{item.qty}</span>
              <span className="text-right">{formatRupiah(item.price)}</span>
              <span className="text-right">{formatRupiah(item.subtotal)}</span>
              <button
                onClick={() => removeItem(item.id)}
                className="text-red-500 hover:text-red-700"
              >
                <Trash size={18} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Subtotal */}
      <div className="text-right font-semibold p-3 border-t">
        Total: {formatRupiah(subtotal)}
      </div>
    </div>
  );
}
