"use client";

import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import { ShoppingCart } from "lucide-react";
import ProductList from "@/components/pos/ProductList";
import CartList from "@/components/pos/CartList";
import PaymentSection from "@/components/pos/PaymentSection";
import ReceiptModal from "@/components/pos/ReceiptModal";
import { Product } from "@/types/products";
import { CartItem } from "@/types/pos";

export default function PosPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [method, setMethod] = useState<"cash" | "qris" | "transfer">("cash");
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);

  // Fetch produk saat mount
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await fetch("/api/products");
        const data = await res.json();
        setProducts(data);
      } catch (err) {
        console.error("Gagal memuat produk:", err);
      }
    };
    fetchProducts();
  }, []);

  // Tambah item ke keranjang
  const handleAddToCart = (p: Product) => {
    setCart((prev) => {
      const found = prev.find((i) => i.id === p.id);
      return found
        ? prev.map((i) => (i.id === p.id ? { ...i, qty: i.qty + 1 } : i))
        : [...prev, { ...p, qty: 1 }];
    });
  };

  // Update qty item di keranjang
  const handleUpdateQty = (id: number, qty: number) => {
    if (qty <= 0) return handleRemove(id);
    setCart((prev) => prev.map((i) => (i.id === id ? { ...i, qty } : i)));
  };

  // Hapus item dari keranjang
  const handleRemove = (id: number) => {
    setCart((prev) => prev.filter((i) => i.id !== id));
  };

  // Hitung total keranjang
  const total = cart.reduce((sum, i) => sum + i.price * i.qty, 0);

  // Bayar -> kirim transaksi ke backend, tampilkan modal
  const handlePay = async () => {
    if (!cart.length) {
      Swal.fire("Keranjang Kosong", "Pilih produk terlebih dahulu", "warning");
      return;
    }
    const totalAmount = total;

    try {
      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart.map((i) => ({
            id: i.id,
            qty: i.qty,
            price: i.price,
          })),
          method,
          payment: totalAmount,
          total: totalAmount,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan transaksi");

      setReceiptData(data);
      setShowReceipt(true);
    } catch (err: any) {
      console.error("Error bayar:", err);
      Swal.fire("Gagal", err.message || "Terjadi kesalahan transaksi", "error");
    }
  };

  // Callback print
  const handlePrint = () => {
    window.print();
  };

  // Tutup modal -> reset keranjang
  const handleCloseReceipt = () => {
    setCart([]);
    setShowReceipt(false);
    setReceiptData(null);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Kolom Kiri: Katalog Produk */}
        <div className="lg:col-span-7 xl:col-span-8">
          <ProductList products={products} onAddToCart={handleAddToCart} />
        </div>

        {/* Kolom Kanan: Panel Keranjang & Pembayaran (Sticky) */}
        <div className="lg:col-span-5 xl:col-span-4 lg:sticky lg:top-20">
          <div className="bg-white border border-slate-200/80 rounded-3xl shadow-sm p-5 space-y-4">
            {/* Header Keranjang */}
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center">
                  <ShoppingCart size={16} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Keranjang Belanja
                  </h2>
                </div>
              </div>
            </div>

            {/* List item keranjang */}
            <CartList
              cart={cart}
              onUpdateQty={handleUpdateQty}
              onRemove={handleRemove}
            />

            {/* Section pembayaran */}
            <PaymentSection
              total={total}
              selected={method}
              onSelect={(m: "cash" | "qris" | "transfer") => setMethod(m)}
              onPay={handlePay}
            />
          </div>
        </div>
      </div>

      {/* Modal struk cetak */}
      <ReceiptModal
        visible={showReceipt}
        cart={cart}
        total={total}
        payment={receiptData?.payment || total}
        method={method}
        change={receiptData?.change || 0}
        receiptData={receiptData}
        onClose={handleCloseReceipt}
        onPrint={handlePrint}
      />
    </div>
  );
}
