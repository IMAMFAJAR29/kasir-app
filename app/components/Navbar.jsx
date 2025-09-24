"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { Package, Layers, ShoppingCart, Power } from "lucide-react";

export default function Navbar() {
  const { data: session } = useSession();
  if (!session) return null;

  const handleLogout = () => signOut({ callbackUrl: "/login" });

  return (
    <header className="w-full fixed top-0 left-0 z-50 bg-white shadow-md rounded-b-2xl">
      <div className="max-w-6xl mx-auto px-4 flex items-center justify-between h-16">
        {/* Logo / Title */}
        <Link href="/" className="text-xl font-bold text-gray-800">
          POS IMAM
        </Link>

        {/* Navigation Menu */}
        <nav className="flex items-center gap-6">
          <Link
            href="/admin/products"
            className="flex items-center gap-2 text-gray-700 hover:text-blue-600 transition"
          >
            <Package className="w-5 h-5" />
            <span>Produk</span>
          </Link>

          <Link
            href="/admin/categories"
            className="flex items-center gap-2 text-gray-700 hover:text-green-600 transition"
          >
            <Layers className="w-5 h-5" />
            <span>Kategori</span>
          </Link>

          <Link
            href="/pos"
            className="flex items-center gap-2 text-gray-700 hover:text-purple-600 transition"
          >
            <ShoppingCart className="w-5 h-5" />
            <span>Kasir</span>
          </Link>
        </nav>

        {/* User + Logout */}
        <div className="flex items-center gap-4">
          <span className="text-gray-600 text-sm">
            {session.user.name || session.user.email}
          </span>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700 transition"
          >
            <Power className="w-4 h-4" />
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}
