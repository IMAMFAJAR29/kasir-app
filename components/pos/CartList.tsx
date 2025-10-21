"use client";

import { Minus, Plus, Trash2 } from "lucide-react";
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
  return (
    <div className="space-y-3 max-h-[300px] overflow-y-auto">
      {cart.map((item) => (
        <div
          key={item.id}
          className="flex justify-between items-center border-b pb-2"
        >
          <div>
            <p className="font-medium">{item.name}</p>
            <p className="text-sm text-gray-500">
              Rp {item.price.toLocaleString("id-ID")} × {item.qty}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onUpdateQty(item.id, item.qty - 1)}
              disabled={item.qty <= 1}
            >
              <Minus size={16} className="text-gray-600" />
            </button>
            <span>{item.qty}</span>
            <button onClick={() => onUpdateQty(item.id, item.qty + 1)}>
              <Plus size={16} className="text-gray-600" />
            </button>
            <button onClick={() => onRemove(item.id)}>
              <Trash2 size={16} className="text-red-500" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
