"use client";

import Image from "next/image";
import { Minus, Plus, Trash2, ShoppingBag } from "lucide-react";
import { CartItem } from "@/types/pos";

interface CartListProps {
  cart: CartItem[];
  onUpdateQty: (id: number, qty: number) => void;
  onRemove: (id: number) => void;
}

export default function CartList({
  cart,
  onUpdateQty,
  onRemove,
}: CartListProps) {
  if (cart.length === 0) {
    return (
      <div className="py-12 px-4 text-center flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl">
        <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-2.5">
          <ShoppingBag className="w-6 h-6" />
        </div>
        <p className="text-sm font-semibold text-slate-700">Keranjang Masih Kosong</p>
        <p className="text-xs text-slate-400 mt-1 max-w-[200px]">
          Klik produk dari katalog di sebelah kiri untuk menambah ke transaksi
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
      {cart.map((item) => {
        const itemSubtotal = item.price * item.qty;

        return (
          <div
            key={item.id}
            className="p-3 bg-slate-50/70 hover:bg-slate-50 border border-slate-200/70 rounded-2xl transition flex items-center justify-between gap-3"
          >
            {/* Thumbnail + Details */}
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className="relative w-11 h-11 rounded-xl bg-white border border-slate-200/80 overflow-hidden shrink-0">
                <Image
                  src={item.imageUrl || "/placeholder.png"}
                  alt={item.name}
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>

              <div className="min-w-0 flex-1">
                <p className="font-semibold text-sm text-slate-900 truncate">
                  {item.name}
                </p>
                <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                  <span>Rp {item.price.toLocaleString("id-ID")}</span>
                  <span>&bull;</span>
                  <span className="font-bold text-slate-900">
                    Rp {itemSubtotal.toLocaleString("id-ID")}
                  </span>
                </div>
              </div>
            </div>

            {/* Stepper + Delete */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="flex items-center bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
                <button
                  type="button"
                  onClick={() => onUpdateQty(item.id, item.qty - 1)}
                  className="w-7 h-7 flex items-center justify-center text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                  disabled={item.qty <= 1}
                  aria-label="Kurangi"
                >
                  <Minus size={13} />
                </button>

                <span className="w-8 text-center text-xs font-bold text-slate-900 select-none">
                  {item.qty}
                </span>

                <button
                  type="button"
                  onClick={() => onUpdateQty(item.id, item.qty + 1)}
                  className="w-7 h-7 flex items-center justify-center text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition cursor-pointer"
                  aria-label="Tambah"
                >
                  <Plus size={13} />
                </button>
              </div>

              <button
                type="button"
                onClick={() => onRemove(item.id)}
                className="w-7 h-7 rounded-xl flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                title="Hapus dari keranjang"
              >
                <Trash2 size={15} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
