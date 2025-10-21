"use client";

import { useEffect, useState } from "react";
import ProductList from "@/components/pos/ProductList";
import CartList from "@/components/pos/CartList";
import PaymentSection from "@/components/pos/PaymentSection";
import ReceiptModal from "@/components/pos/ReceiptModal";
import { Product } from "@/types/products";
import { CartItem } from "@/types/pos";

export default function PosPage() {
  // States utama
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [method, setMethod] = useState<"cash" | "qris" | "transfer">("cash");
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null); // data sale + invoice

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
    if (!cart.length) return alert("Keranjang masih kosong!");

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

      setReceiptData(data); // simpan sale + invoice
      setShowReceipt(true);
    } catch (err: any) {
      console.error("Error bayar:", err);
      alert(err.message);
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
    <div className="grid lg:grid-cols-3 gap-6 p-6">
      <div className="lg:col-span-2">
        {/* List produk */}
        <ProductList products={products} onAddToCart={handleAddToCart} />
      </div>

      <div className="bg-white p-4 rounded-lg shadow">
        <h2 className="text-xl font-bold mb-3">Keranjang</h2>

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

      {/* Modal struk */}
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
