"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ShoppingCart, Package, Layers, LogOut } from "lucide-react";

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    if (!savedUser) {
      router.replace("/login");
    } else {
      setUser(JSON.parse(savedUser));
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    router.replace("/login");
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-600">Memuat dashboard...</p>
      </div>
    );
  }

  return (
    <main className="p-8 max-w-5xl mx-auto">
      {/* Header + Logout */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">
          📊 Dashboard POS IMAM
        </h1>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
        >
          <LogOut className="w-5 h-5" />
          Logout
        </button>
      </div>

      <p className="text-gray-600 mb-8">
        Selamat datang{" "}
        <span className="font-semibold">{user.name || user.email}</span> di
        aplikasi POS sederhana Saya.
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
            href="/admin/products"
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
            href="/admin/categories"
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
            href="/pos"
            className="bg-purple-600 text-white py-2 px-4 rounded-lg mt-auto text-center"
          >
            Buka Kasir
          </Link>
        </div>
      </div>
    </main>
  );
}
