"use client";

"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import {
  CheckCircle,
  Landmark,
  Minus,
  Plus,
  QrCode,
  Search,
  ShoppingCart,
  Trash2,
  Wallet,
} from "lucide-react";

import Button from "../components/Button";

export default function PosPage() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [method, setMethod] = useState("cash");
  const [payment, setPayment] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

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

  const handleCheckout = () => {
    if (cart.length === 0) {
      alert("Keranjang masih kosong!");
      return;
    }
    if (method === "cash" && payment < total) {
      alert("Uang tunai tidak cukup!");
      return;
    }
    printReceipt();
    setCart([]);
    setPayment("");
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

  // filter produk sesuai searchTerm
  const filteredProducts = products.filter((p) =>
    [p.name, p.description, p.category?.name]
      .filter(Boolean)
      .some((field) => field.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
          <ShoppingCart size={28} /> Point of Sales
        </h1>
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
        <div className="lg:col-span-2 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={18}
            />
            <input
              type="text"
              placeholder="Cari produk atau kategori..."
              className="pl-10 w-full bg-white border border-gray-300 rounded-lg px-3 py-2 shadow-sm hover:shadow-md transition focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* List Produk */}
          {filteredProducts.length === 0 ? (
            <p className="text-gray-500">Produk tidak ditemukan</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {filteredProducts.map((p) => (
                <div
                  key={p.id}
                  onClick={() => addToCart(p)}
                  className="rounded-lg shadow-md hover:shadow-lg transition bg-white cursor-pointer overflow-hidden"
                >
                  <div className="relative w-full h-40 bg-gray-50 flex items-center justify-center">
                    <Image
                      src={p.imageUrl || "/no-image.png"}
                      alt={p.name}
                      fill
                      unoptimized
                      className="object-contain p-4"
                    />
                  </div>
                  <div className="p-4 text-center">
                    <h3 className="font-semibold text-lg mb-1">{p.name}</h3>
                    <p className="text-green-600 font-bold mb-2">
                      Rp {Number(p.price).toLocaleString("id-ID")}
                    </p>
                    <span className="inline-block text-xs px-2 py-1 bg-blue-100 text-blue-600 rounded-full">
                      {p.category?.name || ""}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Checkout */}
        <div className="rounded-lg shadow-md bg-white p-5 flex flex-col">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Wallet size={22} /> Keranjang
          </h2>

          {cart.length === 0 ? (
            <p className="text-gray-500">Keranjang kosong</p>
          ) : (
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
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
                      className="p-1 rounded-full bg-gray-100 hover:bg-gray-200"
                    >
                      <Minus size={16} />
                    </button>
                    <span>{item.qty}</span>
                    <button
                      onClick={() => updateQty(item.id, item.qty + 1)}
                      className="p-1 rounded-full bg-gray-100 hover:bg-gray-200"
                    >
                      <Plus size={16} />
                    </button>
                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="p-1 text-red-500 hover:text-red-700"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Total & pembayaran */}
          <div className="mt-4 border-t pt-4 space-y-3">
            <p className="text-lg font-bold text-gray-800">
              Total: Rp {total.toLocaleString("id-ID")}
            </p>
            ...
            <div className="mt-3">
              <label className="block font-semibold mb-2">
                Metode Pembayaran
              </label>
              <div className="grid grid-cols-3 gap-3">
                {/* Tunai */}
                <button
                  type="button"
                  onClick={() => setMethod("cash")}
                  className={`flex flex-col items-center gap-1 border rounded-lg p-3 transition ${
                    method === "cash"
                      ? "border-green-600 bg-green-50 text-green-700 shadow"
                      : "border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  <Wallet className="w-6 h-6" />
                  <span className="text-sm font-medium">Tunai</span>
                </button>

                {/* QRIS */}
                <button
                  type="button"
                  onClick={() => setMethod("qris")}
                  className={`flex flex-col items-center gap-1 border rounded-lg p-3 transition ${
                    method === "qris"
                      ? "border-green-600 bg-green-50 text-green-700 shadow"
                      : "border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  <QrCode className="w-6 h-6" />
                  <span className="text-sm font-medium">QRIS</span>
                </button>

                {/* Transfer */}
                <button
                  type="button"
                  onClick={() => setMethod("transfer")}
                  className={`flex flex-col items-center gap-1 border rounded-lg p-3 transition ${
                    method === "transfer"
                      ? "border-green-600 bg-green-50 text-green-700 shadow"
                      : "border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  <Landmark className="w-6 h-6" />
                  <span className="text-sm font-medium">Transfer</span>
                </button>
              </div>
            </div>
            {method === "cash" && (
              <div>
                <label className="block font-semibold mb-1">Uang Tunai</label>
                <input
                  type="number"
                  className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 shadow-sm focus:ring-2 focus:ring-blue-600"
                  value={payment}
                  onChange={(e) => setPayment(Number(e.target.value))}
                />
                <p className="mt-2 text-sm text-gray-600">
                  Kembalian: Rp{" "}
                  {change > 0 ? change.toLocaleString("id-ID") : 0}
                </p>
              </div>
            )}
            <Button
              onClick={handleCheckout}
              className="w-full flex items-center justify-center gap-2 min-w-[160px]"
            >
              <CheckCircle size={18} /> Bayar & Cetak Struk
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
