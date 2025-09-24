"use client";

import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { Package, Layers, ShoppingCart, Power, Menu, X } from "lucide-react";

export default function Navbar() {
  const { data: session } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);

  if (!session) return null;

  const handleLogout = () => signOut({ callbackUrl: "/login" });

  return (
    <header className="w-full fixed top-0 left-0 z-50 bg-white shadow-md rounded-b-2xl">
      <div className="max-w-6xl mx-auto px-4 flex items-center justify-between h-16">
        {/* Logo */}
        <Link href="/" className="text-xl font-bold text-gray-800">
          POS IMAM
        </Link>

        {/* Desktop Menu */}
        <nav className="hidden md:flex items-center gap-6">
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

        {/* User + Logout (desktop) */}
        <div className="hidden md:flex items-center gap-4">
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

        {/* Mobile Toggle */}
        <button
          className="md:hidden text-gray-700"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="md:hidden bg-white shadow-lg rounded-b-2xl p-4 space-y-4">
          <Link
            href="/admin/products"
            className="flex items-center gap-2 text-gray-700 hover:text-blue-600 transition"
            onClick={() => setMenuOpen(false)}
          >
            <Package className="w-5 h-5" />
            <span>Produk</span>
          </Link>
          <Link
            href="/admin/categories"
            className="flex items-center gap-2 text-gray-700 hover:text-green-600 transition"
            onClick={() => setMenuOpen(false)}
          >
            <Layers className="w-5 h-5" />
            <span>Kategori</span>
          </Link>
          <Link
            href="/pos"
            className="flex items-center gap-2 text-gray-700 hover:text-purple-600 transition"
            onClick={() => setMenuOpen(false)}
          >
            <ShoppingCart className="w-5 h-5" />
            <span>Kasir</span>
          </Link>

          <div className="border-t pt-4">
            <span className="block text-gray-600 text-sm mb-2">
              {session.user.name || session.user.email}
            </span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700 transition w-full justify-center"
            >
              <Power className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
