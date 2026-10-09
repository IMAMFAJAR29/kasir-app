"use client";

import { ShoppingCart } from "lucide-react";
import ProductList from "@/components/pos/ProductList";
import CartList from "@/components/pos/CartList";
import PaymentSection from "@/components/pos/PaymentSection";
import ReceiptModal from "@/components/pos/ReceiptModal";
import type { Product } from "@/types/products";
import type { CartItem } from "@/types/pos";

type PaymentMethod = "cash" | "qris" | "transfer";

export interface ReceiptRecord {
  id?: string | number;
  invoiceNumber?: string;
  payment?: number;
  change?: number;
  pendingSync?: boolean;
}

interface PosSalesWorkspaceProps {
  products: Product[];
  cart: CartItem[];
  total: number;
  method: PaymentMethod;
  online: boolean;
  showReceipt: boolean;
  receiptData: ReceiptRecord | null;
  onAddToCart: (product: Product) => void;
  onUpdateQty: (id: number, qty: number) => void;
  onRemove: (id: number) => void;
  onSelectPayment: (method: PaymentMethod) => void;
  onPay: (paymentAmount?: number) => void;
  onCloseReceipt: () => void;
  onPrintReceipt: () => void;
}

export default function PosSalesWorkspace({
  products,
  cart,
  total,
  method,
  online,
  showReceipt,
  receiptData,
  onAddToCart,
  onUpdateQty,
  onRemove,
  onSelectPayment,
  onPay,
  onCloseReceipt,
  onPrintReceipt,
}: PosSalesWorkspaceProps) {
  return (
    <>
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        <div className="lg:col-span-7 xl:col-span-8">
          <ProductList products={products} onAddToCart={onAddToCart} />
        </div>
        <div className="lg:sticky lg:top-20 lg:col-span-5 xl:col-span-4">
          <div className="space-y-4 rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600 text-white">
                <ShoppingCart size={16} />
              </div>
              <h2 className="text-base font-bold text-slate-900">
                Keranjang Belanja
              </h2>
            </div>
            <CartList
              cart={cart}
              onUpdateQty={onUpdateQty}
              onRemove={onRemove}
            />
            <PaymentSection
              total={total}
              selected={method}
              offline={!online}
              onSelect={onSelectPayment}
              onPay={onPay}
            />
          </div>
        </div>
      </div>
      <ReceiptModal
        visible={showReceipt}
        cart={cart}
        total={total}
        payment={receiptData?.payment || total}
        method={method}
        change={receiptData?.change || 0}
        receiptData={receiptData}
        onClose={onCloseReceipt}
        onPrint={onPrintReceipt}
      />
    </>
  );
}
