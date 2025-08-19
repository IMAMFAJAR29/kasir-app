"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

export default function PosPage() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [method, setMethod] = useState("cash");
  const [payment, setPayment] = useState("");

  useEffect(() => {
    fetch("/api/products")
      .then((res) => res.json())
      .then((data) => setProducts(data));
  }, []);

  const addToCart = (product) => {
    const existing = cart.find((item) => item.id === product.id);
    if (existing) {
      setCart(
        cart.map((item) =>
          item.id === product.id ? { ...item, qty: item.qty + 1 } : item
        )
      );
    } else {
      setCart([...cart, { ...product, qty: 1 }]);
    }
  };

  const removeFromCart = (id) => {
    setCart(cart.filter((item) => item.id !== id));
  };

  const updateQty = (id, qty) => {
    if (qty < 1) return;
    setCart(cart.map((item) => (item.id === id ? { ...item, qty } : item)));
  };

  const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const change = method === "cash" ? payment - total : 0;

  const handleCheckout = async () => {
    if (cart.length === 0) {
      alert("Keranjang masih kosong!");
      return;
    }
    if (method === "cash" && payment < total) {
      alert("Uang tunai tidak cukup!");
      return;
    }

    try {
      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart,
          method,
          payment,
          total,
        }),
      });

      if (!res.ok) throw new Error("Gagal simpan transaksi");
      const data = await res.json();
      console.log("Transaksi tersimpan:", data);

      // cetak struk
      printReceipt();

      setCart([]);
      setPayment("");
    } catch (err) {
      alert("Error saat simpan transaksi");
      console.error(err);
    }
  };

  const printReceipt = () => {
    const receiptWindow = window.open("", "_blank", "width=400,height=600");
    const date = new Date().toLocaleString("id-ID");

    receiptWindow.document.write(`
      <html>
        <head>
          <title>Struk Belanja</title>
          <style>
            body { font-family: monospace; padding: 10px; width: 58mm; }
            h2 { text-align: center; margin: 0; }
            .total { font-weight: bold; margin-top: 10px; }
            .footer { text-align: center; margin-top: 20px; font-size: 12px; }
            table { width: 100%; }
            td { padding: 4px 0; }
            .right { text-align: right; }
          </style>
        </head>
        <body>
          <h2>🛒 WARUNG IMAM </h2>
          <p>${date}</p>
          <hr />
          <table>
            ${cart
              .map(
                (item) => `
              <tr>
                <td>${item.name} x${item.qty}</td>
                <td class="right">Rp ${(item.price * item.qty).toLocaleString(
                  "id-ID"
                )}</td>
              </tr>
            `
              )
              .join("")}
          </table>
          <hr />
          <p class="total">Total: Rp ${total.toLocaleString("id-ID")}</p>
          <p>Metode: ${method}</p>
          ${
            method === "cash"
              ? `<p>Tunai: Rp ${Number(payment).toLocaleString("id-ID")}</p>
                 <p>Kembalian: Rp ${change.toLocaleString("id-ID")}</p>`
              : `<p>Status: Lunas ✅</p>`
          }
          <div class="footer">
            <p>Terima kasih 🙏</p>
            <p>Barang yang sudah dibeli tidak dapat dikembalikan</p>
          </div>
        </body>
      </html>
    `);

    receiptWindow.document.close();
    receiptWindow.print();
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">💳 Point of Sales</h1>
        <span className="text-gray-500 text-sm">
          {new Date().toLocaleDateString("id-ID", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Produk */}
        <div className="lg:col-span-2">
          {products.length === 0 ? (
            <p className="text-gray-500">Belum ada produk</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {products.map((p) => (
                <div
                  key={p.id}
                  className="border rounded-xl shadow hover:shadow-lg transition bg-white cursor-pointer overflow-hidden"
                  onClick={() => addToCart(p)}
                >
                  <div className="relative w-full h-40 bg-gray-100">
                    <Image
                      src={p.imageUrl || "/no-image.png"}
                      alt={p.name}
                      fill
                      unoptimized
                      className="object-cover"
                    />
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-lg">{p.name}</h3>
                    <p className="text-green-600 font-bold">
                      Rp {Number(p.price).toLocaleString("id-ID")}
                    </p>
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                      {p.description}
                    </p>
                    <span className="inline-block mt-2 text-xs px-2 py-1 bg-blue-100 text-blue-600 rounded-full">
                      {p.category?.name || "Tanpa Kategori"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Checkout */}
        <div className="border rounded-xl shadow bg-white p-5">
          <h2 className="text-xl font-bold mb-4">🛒 Keranjang</h2>

          {cart.length === 0 ? (
            <p className="text-gray-500">Keranjang kosong</p>
          ) : (
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
              {cart.map((item) => (
                <div
                  key={item.id}
                  className="flex justify-between items-center border-b pb-2"
                >
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-gray-500">
                      Rp {item.price.toLocaleString("id-ID")} x {item.qty}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateQty(item.id, item.qty - 1)}
                      className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300"
                    >
                      -
                    </button>
                    <span>{item.qty}</span>
                    <button
                      onClick={() => updateQty(item.id, item.qty + 1)}
                      className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300"
                    >
                      +
                    </button>
                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="ml-2 text-red-500 hover:text-red-700"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Total & pembayaran */}
          <div className="mt-4 border-t pt-4">
            <p className="text-lg font-bold text-gray-800">
              Total: Rp {total.toLocaleString("id-ID")}
            </p>

            <div className="mt-3">
              <label className="block font-semibold mb-1">
                Metode Pembayaran
              </label>
              <select
                className="border p-2 rounded w-full"
                value={method}
                onChange={(e) => setMethod(e.target.value)}
              >
                <option value="cash">Tunai</option>
                <option value="qris">QRIS</option>
                <option value="transfer">Transfer</option>
              </select>
            </div>

            {method === "cash" && (
              <div className="mt-3">
                <label className="block font-semibold mb-1">Uang Tunai</label>
                <input
                  type="number"
                  className="border p-2 rounded w-full"
                  value={payment}
                  onChange={(e) => setPayment(Number(e.target.value))}
                />
                <p className="mt-2 text-sm">
                  Kembalian: Rp{" "}
                  {change > 0 ? change.toLocaleString("id-ID") : 0}
                </p>
              </div>
            )}

            <button
              onClick={handleCheckout}
              className="mt-4 bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-xl w-full font-semibold shadow"
            >
              ✅ Bayar & Cetak Struk
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
