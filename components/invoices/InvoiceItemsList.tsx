"use client";

import { InvoiceItem } from "../../types/invoice";
import { Trash2 } from "lucide-react";
import { formatRupiah } from "@/lib/invoiceHelpers";

interface InvoiceItemsListProps {
  items: InvoiceItem[];
  onUpdateQty: (index: number, qty: number) => void;
  onUpdatePrice: (index: number, price: number) => void;
  onRemoveItem: (index: number) => void;
}

export default function InvoiceItemsList({
  items,
  onUpdateQty,
  onUpdatePrice,
  onRemoveItem,
}: InvoiceItemsListProps) {
  return (
    <div className="border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-[3fr_1fr_1fr_1fr_auto] gap-2 px-3 py-2 font-semibold bg-gray-100">
        <span>Nama Produk</span>
        <span className="text-center">Qty</span>
        <span className="text-right">Harga/unit</span>
        <span className="text-right">Total</span>
        <span></span>
      </div>

      {/* Items */}
      <div className="divide-y">
        {items.map((item, idx) => (
          <div
            key={idx}
            className="grid grid-cols-[3fr_1fr_1fr_1fr_auto] gap-2 items-center px-3 py-2"
          >
            {/* Nama & SKU */}
            <div>
              <p className="font-medium">{item.name}</p>
              {item.sku && (
                <p className="text-xs text-gray-500">SKU: {item.sku}</p>
              )}
            </div>

            {/* Qty */}
            <input
              type="number"
              className="w-full rounded p-1 text-center border"
              value={item.qty}
              min={0}
              onChange={(e) => onUpdateQty(idx, Number(e.target.value))}
            />

            {/* Harga/unit */}
            <input
              type="number"
              className="w-full rounded p-1 text-right border"
              value={item.price}
              min={0}
              onChange={(e) => onUpdatePrice(idx, Number(e.target.value))}
            />

            {/* Total */}
            <span className="text-right font-medium">
              {formatRupiah(item.qty * item.price)}
            </span>

            {/* Hapus */}
            <button
              onClick={() => onRemoveItem(idx)}
              className="text-red-500 hover:text-red-700 flex items-center justify-center"
            >
              <Trash2 size={20} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
