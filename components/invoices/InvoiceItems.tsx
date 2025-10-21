"use client";
import { Plus, Trash } from "lucide-react";
import Image from "next/image";
import Button from "@/components/Button";
import { Product, InvoiceItem } from "@/types/invoice";
import { formatRupiah } from "@/lib/invoiceHelpers";

interface Props {
  products: Product[];
  items: InvoiceItem[];
  discount: number;
  shipping: number;
  onAddItem: () => void;
  onProductChange: (index: number, productId: number) => void;
  onQtyChange: (index: number, qty: number) => void;
  onDeleteItem: (index: number) => void;
  onDiscountChange: (val: number) => void;
  onShippingChange: (val: number) => void;
  totalAmount: number;
}

export default function InvoiceItems({
  products,
  items,
  discount,
  shipping,
  onAddItem,
  onProductChange,
  onQtyChange,
  onDeleteItem,
  onDiscountChange,
  onShippingChange,
  totalAmount,
}: Props) {
  return (
    <div className="bg-white shadow-lg p-6 space-y-4 mb-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-semibold text-lg">Item Produk</h2>
        <Button
          onClick={onAddItem}
          className="bg-black text-white hover:bg-gray-800"
        >
          <Plus size={16} /> Tambah Item
        </Button>
      </div>

      {items.map((item, index) => {
        const product = products.find((p) => p.id === item.productId);
        return (
          <div
            key={index}
            className="grid grid-cols-12 gap-2 items-center mb-2"
          >
            <div className="col-span-5 flex items-center gap-2">
              {product?.imageUrl && (
                <Image
                  src={product.imageUrl}
                  alt={product.name}
                  className="w-10 h-10 object-cover rounded"
                  width={40}
                  height={40}
                />
              )}
              <select
                value={item.productId}
                onChange={(e) => onProductChange(index, Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg shadow focus:outline-none focus:ring-2 focus:ring-black/30"
              >
                <option value={0}>Pilih Produk</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.stock ? `(Stok: ${p.stock})` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-span-2">
              <input
                type="number"
                value={item.qty}
                min={1}
                onChange={(e) => onQtyChange(index, Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg shadow focus:outline-none focus:ring-2 focus:ring-black/30"
              />
            </div>
            <div className="col-span-2">
              <input
                type="text"
                value={formatRupiah(item.price)}
                readOnly
                className="w-full px-3 py-2 rounded-lg shadow bg-gray-100 cursor-not-allowed"
              />
            </div>
            <div className="col-span-2">
              <input
                type="text"
                value={formatRupiah(item.subtotal)}
                readOnly
                className="w-full px-3 py-2 rounded-lg shadow bg-gray-100 cursor-not-allowed"
              />
            </div>
            <div className="col-span-1 flex justify-center">
              <button
                onClick={() => onDeleteItem(index)}
                className="text-red-500 hover:text-red-700"
              >
                <Trash size={18} />
              </button>
            </div>
          </div>
        );
      })}

      <div className="grid grid-cols-2 gap-4 mt-4">
        <input
          type="text"
          placeholder="Diskon"
          value={formatRupiah(discount)}
          onChange={(e) =>
            onDiscountChange(Number(e.target.value.replace(/\D/g, "")))
          }
          className="w-full px-4 py-3 rounded-lg shadow focus:outline-none focus:ring-2 focus:ring-black/30"
        />
        <input
          type="text"
          placeholder="Ongkir"
          value={formatRupiah(shipping)}
          onChange={(e) =>
            onShippingChange(Number(e.target.value.replace(/\D/g, "")))
          }
          className="w-full px-4 py-3 rounded-lg shadow focus:outline-none focus:ring-2 focus:ring-black/30"
        />
      </div>

      <div className="text-right font-semibold text-lg mt-4">
        Total: {formatRupiah(totalAmount)}
      </div>
    </div>
  );
}
