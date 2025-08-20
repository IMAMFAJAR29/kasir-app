import Link from "next/link";
import { ShoppingCart, Package, Layers } from "lucide-react";

export default function Home() {
  return (
    <main className="p-8 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">
        📊 Dashboard POS IMAM
      </h1>
      <p className="text-gray-600 mb-8">
        Selamat datang di aplikasi POS sederhana Saya.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card Produk */}
        <div className="border rounded-2xl shadow p-6 flex flex-col">
          <div className="flex justify-center mb-4">
            <Package className="w-10 h-10 text-blue-600" />
          </div>
          <h2 className="text-xl font-semibold text-center">Produk</h2>
          <p className="text-gray-600 text-center mb-4 flex-1">
            Kelola daftar produk dan stok barang Anda
          </p>
          <Link
            href="/products"
            className="bg-blue-600 text-white py-2 px-4 rounded-lg mt-auto text-center"
          >
            Kelola Produk
          </Link>
        </div>

        {/* Card Kategori */}
        <div className="border rounded-2xl shadow p-6 flex flex-col">
          <div className="flex justify-center mb-4">
            <Layers className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-xl font-semibold text-center">Kategori</h2>
          <p className="text-gray-600 text-center mb-4 flex-1">
            Atur kategori produk agar lebih rapi
          </p>
          <Link
            href="/categories"
            className="bg-green-600 text-white py-2 px-4 rounded-lg mt-auto text-center"
          >
            Kelola Kategori
          </Link>
        </div>

        {/* Card Kasir */}
        <div className="border rounded-2xl shadow p-6 flex flex-col">
          <div className="flex justify-center mb-4">
            <ShoppingCart className="w-10 h-10 text-purple-600" />
          </div>
          <h2 className="text-xl font-semibold text-center">Kasir</h2>
          <p className="text-gray-600 text-center mb-4 flex-1">
            Mulai transaksi penjualan dengan cepat
          </p>

          <Link
            href="/cashier"
            className="bg-purple-600 text-white py-2 px-4 rounded-lg mt-auto text-center"
          >
            Buka Kasir
          </Link>
        </div>
      </div>
    </main>
  );
}
