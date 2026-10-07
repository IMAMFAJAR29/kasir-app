"use client";

import { useState, useRef, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  Package,
  Layers,
  ShoppingCart,
  Power,
  Menu,
  X,
  FileText,
  ChevronDown,
  Warehouse,
  Tags,
  Users,
  FileCheck2,
} from "lucide-react";

export default function Navbar() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const userDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        userDropdownRef.current &&
        !userDropdownRef.current.contains(event.target as Node)
      ) {
        setUserDropdownOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (status === "loading" || !session) return null;

  const handleLogout = () => signOut({ callbackUrl: "/auth" });

  const isActive = (path: string) => {
    if (path === "/" || path === "/admin/dashboard") {
      return pathname === "/" || pathname === "/admin/dashboard";
    }
    return pathname.startsWith(path);
  };

  const userName =
    session?.user?.name || session?.user?.email?.split("@")?.[0] || "User";
  const userInitial = userName.charAt(0).toUpperCase();

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-6">
          <Link href="/admin/dashboard" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-slate-900 text-white">
              <ShoppingCart className="h-4 w-4" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-base font-semibold tracking-tight text-slate-900">
                POS IMAM
              </span>
            </div>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex">
            <Link
              href="/admin/dashboard"
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
                isActive("/admin/dashboard")
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <LayoutDashboard className="h-4 w-4" />
              <span>Dashboard</span>
            </Link>

            <div className="group relative">
              <button
                className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  isActive("/admin/products") || isActive("/admin/categories")
                    ? "bg-slate-100 text-slate-900"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <Package className="h-4 w-4" />
                <span>Katalog</span>
                <ChevronDown className="h-3.5 w-3.5 opacity-70" />
              </button>

              <div className="absolute left-0 top-full hidden pt-2 group-hover:block z-50">
                <div className="min-w-[210px] rounded-xl border border-slate-200 bg-white p-1.5 shadow-sm">
                  <Link
                    href="/admin/products"
                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                  >
                    <Package className="h-4 w-4 text-slate-600" />
                    <div>
                      <div className="font-medium">Daftar Produk</div>
                      <div className="text-[11px] text-slate-500">Kelola stok & harga</div>
                    </div>
                  </Link>
                  <Link
                    href="/admin/categories"
                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                  >
                    <Tags className="h-4 w-4 text-slate-600" />
                    <div>
                      <div className="font-medium">Kategori Produk</div>
                      <div className="text-[11px] text-slate-500">Hierarki & subkategori</div>
                    </div>
                  </Link>
                </div>
              </div>
            </div>

            <div className="group relative">
              <button
                className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  isActive("/invoices") || isActive("/sales/customers")
                    ? "bg-slate-100 text-slate-900"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <FileCheck2 className="h-4 w-4" />
                <span>Penjualan</span>
                <ChevronDown className="h-3.5 w-3.5 opacity-70" />
              </button>

              <div className="absolute left-0 top-full hidden pt-2 group-hover:block z-50">
                <div className="min-w-[220px] rounded-xl border border-slate-200 bg-white p-1.5 shadow-sm">
                  <Link
                    href="/invoices"
                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                  >
                    <FileText className="h-4 w-4 text-slate-600" />
                    <div>
                      <div className="font-medium">Faktur Penjualan</div>
                      <div className="text-[11px] text-slate-500">Tagihan & status bayar</div>
                    </div>
                  </Link>
                  <Link
                    href="/sales/customers"
                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                  >
                    <Users className="h-4 w-4 text-slate-600" />
                    <div>
                      <div className="font-medium">Kontak Pelanggan</div>
                      <div className="text-[11px] text-slate-500">Data customer & pemasok</div>
                    </div>
                  </Link>
                </div>
              </div>
            </div>

            <Link
              href="/purchases"
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
                isActive("/purchases")
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <FileText className="h-4 w-4" />
              <span>Pembelian</span>
            </Link>

            <div className="group relative">
              <button
                className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  isActive("/warehouse")
                    ? "bg-slate-100 text-slate-900"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <Warehouse className="h-4 w-4" />
                <span>Gudang</span>
                <ChevronDown className="h-3.5 w-3.5 opacity-70" />
              </button>

              <div className="absolute left-0 top-full hidden pt-2 group-hover:block z-50">
                <div className="min-w-[200px] rounded-xl border border-slate-200 bg-white p-1.5 shadow-sm">
                  <Link
                    href="/warehouse/stock"
                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                  >
                    <Layers className="h-4 w-4 text-slate-600" />
                    <div>
                      <div className="font-medium">Stok Gudang</div>
                      <div className="text-[11px] text-slate-500">Inventaris & mutasi</div>
                    </div>
                  </Link>
                  <Link
                    href="/warehouse/locations"
                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                  >
                    <Warehouse className="h-4 w-4 text-slate-600" />
                    <div>
                      <div className="font-medium">Lokasi Gudang</div>
                      <div className="text-[11px] text-slate-500">Cabang & penyimpanan</div>
                    </div>
                  </Link>
                </div>
              </div>
            </div>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/pos"
            className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition ${
              pathname === "/pos"
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
            }`}
          >
            <ShoppingCart className="h-4 w-4" />
            <span className="hidden sm:inline">Kasir POS</span>
          </Link>

          <div className="relative" ref={userDropdownRef}>
            <button
              onClick={() => setUserDropdownOpen(!userDropdownOpen)}
              className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-1.5 pl-2 text-left transition hover:bg-slate-50"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-900 text-xs font-semibold text-white">
                {userInitial}
              </div>
              <span className="hidden text-sm font-medium text-slate-700 md:inline">
                {userName}
              </span>
              <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
            </button>

            {userDropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-xl border border-slate-200 bg-white p-2 shadow-sm z-50">
                <div className="mb-1 border-b border-slate-100 px-3 py-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                    Masuk sebagai
                  </p>
                  <p className="truncate text-sm font-semibold text-slate-900">
                    {userName}
                  </p>
                  <p className="truncate text-xs text-slate-500">
                    {session?.user?.email || ""}
                  </p>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-rose-600 transition hover:bg-rose-50"
                >
                  <Power className="h-4 w-4" />
                  Logout
                </button>
              </div>
            )}
          </div>

          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="rounded-lg border border-slate-200 p-2 text-slate-700 hover:bg-slate-50 lg:hidden"
            aria-label="Toggle Menu"
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="border-t border-slate-200 bg-white px-4 py-4 lg:hidden">
          <div className="space-y-2">
            <Link
              href="/admin/dashboard"
              onClick={() => setMenuOpen(false)}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium ${
                isActive("/admin/dashboard")
                  ? "bg-slate-900 text-white"
                  : "text-slate-700 hover:bg-slate-100"
              }`}
            >
              <LayoutDashboard className="h-4 w-4" />
              <span>Dashboard</span>
            </Link>

            <Link
              href="/pos"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-700"
            >
              <ShoppingCart className="h-4 w-4 text-slate-700" />
              <span>Kasir POS</span>
            </Link>

            <div className="pt-2">
              <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                Katalog
              </p>
              <Link
                href="/admin/products"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
              >
                <Package className="h-4 w-4 text-slate-400" />
                <span>Produk</span>
              </Link>
              <Link
                href="/admin/categories"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
              >
                <Tags className="h-4 w-4 text-slate-400" />
                <span>Kategori</span>
              </Link>
            </div>

            <div className="pt-2">
              <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                Transaksi
              </p>
              <Link
                href="/invoices"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
              >
                <FileText className="h-4 w-4 text-slate-400" />
                <span>Faktur Penjualan</span>
              </Link>
              <Link
                href="/purchases"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
              >
                <FileCheck2 className="h-4 w-4 text-slate-400" />
                <span>Pembelian</span>
              </Link>
              <Link
                href="/sales/customers"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
              >
                <Users className="h-4 w-4 text-slate-400" />
                <span>Kontak Pelanggan</span>
              </Link>
            </div>

            <div className="pt-2">
              <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                Gudang
              </p>
              <Link
                href="/warehouse/stock"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
              >
                <Layers className="h-4 w-4 text-slate-400" />
                <span>Stok Gudang</span>
              </Link>
              <Link
                href="/warehouse/locations"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
              >
                <Warehouse className="h-4 w-4 text-slate-400" />
                <span>Lokasi Gudang</span>
              </Link>
            </div>

            <button
              onClick={handleLogout}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-600 hover:bg-rose-100"
            >
              <Power className="h-4 w-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
