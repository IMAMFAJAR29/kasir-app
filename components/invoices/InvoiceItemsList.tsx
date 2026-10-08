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
    <div className="overflow-hidden rounded-2xl border border-slate-200">
      <div className="overflow-x-auto">
        <div className="grid min-w-[620px] grid-cols-[3fr_0.8fr_1.2fr_1.2fr_auto] gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold text-slate-600">
          <span>Nama Produk</span>
          <span className="text-center">Qty</span>
          <span className="text-right">Harga/unit</span>
          <span className="text-right">Total</span>
          <span></span>
        </div>

        <div className="divide-y divide-slate-100">
          {items.map((item, idx) => (
            <div
              key={idx}
              className="grid min-w-[620px] grid-cols-[3fr_0.8fr_1.2fr_1.2fr_auto] items-center gap-3 px-4 py-3 text-sm text-slate-700"
            >
              <div>
                <p className="font-medium text-slate-800">{item.name}</p>
                {item.sku && (
                  <p className="text-xs text-slate-500">SKU: {item.sku}</p>
                )}
              </div>

              <input
                type="number"
                className="form-control min-h-9 px-2 py-1 text-center"
                value={item.qty}
                min={0}
                onChange={(e) => onUpdateQty(idx, Number(e.target.value))}
              />

              <input
                type="number"
                className="form-control min-h-9 px-2 py-1 text-right"
                value={item.price}
                min={0}
                onChange={(e) => onUpdatePrice(idx, Number(e.target.value))}
              />

              <span className="text-right font-medium">
                {formatRupiah(item.qty * item.price)}
              </span>

              <button
                type="button"
                onClick={() => onRemoveItem(idx)}
                aria-label={`Hapus ${item.name}`}
                className="flex items-center justify-center rounded-lg p-2 text-rose-500 transition hover:bg-rose-50 hover:text-rose-700"
              >
                <Trash2 size={20} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
