"use client";

import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { LayoutDashboard } from "lucide-react";
import Link from "next/link";
import {
  Package,
  Layers,
  ShoppingCart,
  Power,
  Menu,
  X,
  FileText,
} from "lucide-react";

export default function Navbar() {
  const { data: session, status } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);

  if (status === "loading") return null;
  if (!session) return null;

  const handleLogout = () => signOut({ callbackUrl: "/login" });

  return (
    <header className="w-full fixed top-0 left-0 z-50 bg-white shadow-md rounded-b-2xl">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* === LOGO === */}
        <div className="flex items-center">
          <Link
            href="/"
            className="flex items-center gap-2 text-xl font-bold text-gray-900 hover:text-gray-700 transition"
          >
            <LayoutDashboard className="w-6 h-6 text-gray-800" />
            <span className="tracking-wide">POS IMAM</span>
          </Link>
        </div>

        {/* === MENU DESKTOP === */}
        <nav className="hidden md:flex items-center justify-center gap-8">
          {/* === KATALOG === */}
          <div className="relative group">
            <button className="flex items-center gap-2 text-gray-800 hover:text-black transition">
              <Package className="w-5 h-5" />
              <span>Katalog</span>
              <svg
                className="w-3 h-3 mt-1"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>
            <div className="absolute left-0 top-full hidden group-hover:block bg-white shadow-lg rounded p-2 min-w-[170px] z-50">
              <Link
                href="/admin/products"
                className="block px-3 py-2 hover:bg-gray-100 rounded"
              >
                Produk
              </Link>
              <Link
                href="/admin/categories"
                className="block px-3 py-2 hover:bg-gray-100 rounded"
              >
                Kategori
              </Link>
            </div>
          </div>

          {/* === PENJUALAN === */}
          <div className="relative group">
            <button className="flex items-center gap-2 text-gray-800 hover:text-black transition">
              <ShoppingCart className="w-5 h-5" />
              <span>Penjualan</span>
              <svg
                className="w-3 h-3 mt-1"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>
            <div className="absolute left-0 top-full hidden group-hover:block bg-white shadow-lg rounded p-2 min-w-[220px] z-50">
              <Link
                href="/pos"
                className="block px-3 py-2 hover:bg-gray-100 rounded"
              >
                Kasir
              </Link>
              <Link
                href="/invoices"
                className="block px-3 py-2 hover:bg-gray-100 rounded"
              >
                Transaksi Faktur
              </Link>
              <Link
                href="/sales/customers" // tetap ambil API customers untuk pemasok
                className="block px-3 py-2 hover:bg-gray-100 rounded"
              >
                Kontak Pemasok
              </Link>
            </div>
          </div>

          {/* === PEMBELIAN === */}
          <div className="relative group">
            <button className="flex items-center gap-2 text-gray-800 hover:text-black transition">
              <FileText className="w-5 h-5" />
              <span>Pembelian</span>
              <svg
                className="w-3 h-3 mt-1"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>

            <div className="absolute left-0 top-full hidden group-hover:block bg-white shadow-lg rounded p-2 min-w-[200px] z-50">
              <Link
                href="/purchases"
                className="block px-3 py-2 hover:bg-gray-100 rounded"
              >
                Transaksi Pembelian
              </Link>
            </div>
          </div>

          {/* === GUDANG === */}
          <div className="relative group">
            <button className="flex items-center gap-2 text-gray-800 hover:text-black transition">
              <Layers className="w-5 h-5" />
              <span>Gudang</span>
              <svg
                className="w-3 h-3 mt-1"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>
            <div className="absolute left-0 top-full hidden group-hover:block bg-white shadow-lg rounded p-2 min-w-[150px] z-50">
              <Link
                href="/warehouse/locations"
                className="block px-3 py-2 hover:bg-gray-100 rounded"
              >
                Lokasi
              </Link>
              <Link
                href="/warehouse/stock"
                className="block px-3 py-2 hover:bg-gray-100 rounded"
              >
                Stock
              </Link>
            </div>
          </div>
        </nav>

        {/* === USER + LOGOUT DESKTOP === */}
        <div className="hidden md:flex items-center gap-4">
          <span className="text-gray-700 text-sm font-medium">
            {session?.user?.name || session?.user?.email || ""}
          </span>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition"
          >
            <Power className="w-4 h-4" />
            Logout
          </button>
        </div>

        {/* === TOGGLE MENU MOBILE === */}
        <button
          className="md:hidden text-gray-800"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle Menu"
        >
          {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* === MENU MOBILE === */}
      {menuOpen && (
        <div className="md:hidden bg-white shadow-lg rounded-b-2xl p-4 space-y-4 border-t">
          {/* MOBILE: KATALOG */}
          <div className="space-y-1">
            <span className="block text-gray-700 text-sm font-medium">
              Katalog
            </span>
            <Link
              href="/admin/products"
              onClick={() => setMenuOpen(false)}
              className="block px-3 py-2 hover:bg-gray-100 rounded"
            >
              Produk
            </Link>
            <Link
              href="/admin/categories"
              onClick={() => setMenuOpen(false)}
              className="block px-3 py-2 hover:bg-gray-100 rounded"
            >
              Kategori Produk
            </Link>
          </div>

          {/* MOBILE: PENJUALAN */}
          <div className="space-y-1 pt-2 border-t">
            <span className="block text-gray-700 text-sm font-medium">
              Penjualan
            </span>
            <Link
              href="/pos"
              onClick={() => setMenuOpen(false)}
              className="block px-3 py-2 hover:bg-gray-100 rounded"
            >
              Kasir
            </Link>
            <Link
              href="/invoices"
              onClick={() => setMenuOpen(false)}
              className="block px-3 py-2 hover:bg-gray-100 rounded"
            >
              Transaksi Faktur
            </Link>
            <Link
              href="/sales/customers"
              onClick={() => setMenuOpen(false)}
              className="block px-3 py-2 hover:bg-gray-100 rounded"
            >
              Kontak Pemasok
            </Link>
          </div>

          {/* MOBILE: PEMBELIAN */}
          <div className="space-y-1 pt-2 border-t">
            <span className="block text-gray-700 text-sm font-medium">
              Pembelian
            </span>
            <Link
              href="/purchases"
              onClick={() => setMenuOpen(false)}
              className="block px-3 py-2 hover:bg-gray-100 rounded"
            >
              Daftar Pembelian
            </Link>
            <Link
              href="/purchases/create"
              onClick={() => setMenuOpen(false)}
              className="block px-3 py-2 hover:bg-gray-100 rounded"
            >
              Tambah Pembelian
            </Link>
            <Link
              href="/sales/customers"
              onClick={() => setMenuOpen(false)}
              className="block px-3 py-2 hover:bg-gray-100 rounded"
            >
              Kontak Pemasok
            </Link>
          </div>

          {/* MOBILE: GUDANG */}
          <div className="pt-2 border-t space-y-1">
            <span className="block text-gray-700 text-sm font-medium">
              Gudang
            </span>
            <Link
              href="/warehouse/locations"
              onClick={() => setMenuOpen(false)}
              className="block px-3 py-2 hover:bg-gray-100 rounded"
            >
              Lokasi
            </Link>
            <Link
              href="/warehouse/stock"
              onClick={() => setMenuOpen(false)}
              className="block px-3 py-2 hover:bg-gray-100 rounded"
            >
              Stock
            </Link>
          </div>

          {/* MOBILE: USER + LOGOUT */}
          <div className="border-t pt-4">
            <span className="block text-gray-700 text-sm mb-3 font-medium">
              {session?.user?.name || session?.user?.email || ""}
            </span>
            <button
              onClick={handleLogout}
              className="flex items-center justify-center gap-2 w-full bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition"
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
