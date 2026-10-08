"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Coins,
  Package,
  Tags,
  Users,
  ShoppingCart,
  TrendingUp,
  ArrowUpRight,
  FileText,
  Layers,
  Sparkles,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import BrandLoader from "@/components/BrandLoader";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

// ====== Interfaces ======
interface Stats {
  totalProducts: number;
  totalCategories: number;
  totalInvoices: number;
  totalCustomers: number;
  totalRevenue: number;
}

interface SaleData {
  date: string;
  total: number;
}

interface TopProduct {
  name: string;
  sold: number;
  price: number;
}

interface DashboardData {
  stats: Stats;
  sales: SaleData[];
  topProducts: TopProduct[];
}

// Custom Tooltip untuk Recharts
function CustomChartTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900 text-white px-3.5 py-2.5 rounded-xl shadow-xl text-xs space-y-1 border border-slate-700">
        <p className="text-slate-400 font-medium">{label}</p>
        <p className="font-bold text-sm text-emerald-400">
          Rp {Number(payload[0].value).toLocaleString("id-ID")}
        </p>
      </div>
    );
  }
  return null;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/reports/dashboard")
      .then(async (res) => {
        if (!res.ok) throw new Error(`API error ${res.status}`);
        const json = await res.json();

        const stats: Stats = json.stats
          ? json.stats
          : {
              totalProducts: Number(json.totalProducts ?? 0),
              totalCategories: Number(json.totalCategories ?? 0),
              totalInvoices: Number(json.totalInvoices ?? 0),
              totalCustomers: Number(json.totalCustomers ?? 0),
              totalRevenue: Number(
                json.totalSalesToday ?? json.totalRevenue ?? 0
              ),
            };

        const sales: SaleData[] = json.sales
          ? json.sales
          : (json.salesData ?? []).map((s: any) => ({
              date:
                s.date ??
                s.day ??
                new Date(s.createdAt ?? Date.now()).toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "short",
                }),
              total: Number(s.total ?? s.sales ?? s._sum?.total ?? 0),
            }));

        const topProducts: TopProduct[] =
          json.topProducts ?? json.topSelling ?? [];

        setData({ stats, sales, topProducts });
      })
      .catch((err) => {
        console.error(err);
        setError("Gagal memuat data dashboard.");
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <BrandLoader
        label="Memuat data analitik..."
        className="min-h-[70vh]"
      />
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-sm">
          {error}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { stats, sales, topProducts } = data;
  const maxSold = Math.max(...topProducts.map((p) => p.sold), 1);

  const todayDateString = new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* === HERO WELCOME HEADER === */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white text-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-sm relative overflow-hidden">
        <div className="relative z-10 space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-medium mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Sistem Kasir & Operasional Aktif</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Ringkasan Bisnis & Performa
          </h1>
          <p className="text-sm text-slate-500">
            {todayDateString} &bull; Pantau transaksi, stok, dan penjualan terkini secara real-time.
          </p>
        </div>

        {/* Decorative background glow */}
        <div className="absolute right-0 top-0 w-72 h-72 bg-teal-100/60 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* === KPI STAT CARDS === */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Pendapatan (Paid)"
          value={`Rp ${Number(stats.totalRevenue).toLocaleString("id-ID")}`}
          subtitle="Total omset terverifikasi"
          icon={<Coins className="w-6 h-6 text-emerald-600" />}
          iconBg="bg-emerald-50 border-emerald-100"
          accent="emerald"
        />
        <StatCard
          title="Total Produk"
          value={stats.totalProducts}
          subtitle="Item katalog aktif"
          icon={<Package className="w-6 h-6 text-indigo-600" />}
          iconBg="bg-indigo-50 border-indigo-100"
          accent="indigo"
        />
        <StatCard
          title="Kategori Produk"
          value={stats.totalCategories}
          subtitle="Pengelompokan barang"
          icon={<Tags className="w-6 h-6 text-amber-600" />}
          iconBg="bg-amber-50 border-amber-100"
          accent="amber"
        />
        <StatCard
          title="Total Pelanggan"
          value={stats.totalCustomers}
          subtitle="Kontak mitra & pembeli"
          icon={<Users className="w-6 h-6 text-sky-600" />}
          iconBg="bg-sky-50 border-sky-100"
          accent="sky"
        />
      </div>

      {/* === GRID GRAFIK & PRODUK TERLARIS === */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Grafik Penjualan 7 Hari */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Tren Penjualan 7 Hari Terakhir</CardTitle>
              <CardDescription>Grafik pergerakan nilai transaksi harian</CardDescription>
            </div>
            <Badge color="purple" dot>
              Minggu Ini
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sales} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="date"
                    stroke="#94a3b8"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(val) =>
                      val >= 1000000
                        ? `${(val / 1000000).toFixed(1)}M`
                        : val >= 1000
                        ? `${(val / 1000).toFixed(0)}k`
                        : `${val}`
                    }
                  />
                  <Tooltip content={<CustomChartTooltip />} />
                  <Bar
                    dataKey="total"
                    fill="#1769e0"
                    radius={[8, 8, 0, 0]}
                    maxBarSize={45}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Produk Terlaris Hari Ini */}
        <Card className="flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle>Produk Terlaris Hari Ini</CardTitle>
              <CardDescription>Item paling banyak diminati</CardDescription>
            </div>
            <TrendingUp className="w-5 h-5 text-indigo-600" />
          </CardHeader>
          <CardContent className="flex-1 overflow-auto">
            {topProducts.length === 0 ? (
              <div className="h-48 flex flex-col items-center justify-center text-center p-4">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-2">
                  <Package className="w-6 h-6" />
                </div>
                <p className="text-sm font-medium text-slate-600">Belum ada transaksi hari ini</p>
                <p className="text-xs text-slate-400 mt-0.5">Produk yang terjual akan muncul di sini</p>
              </div>
            ) : (
              <div className="space-y-3.5 pt-2">
                {topProducts.map((p, i) => {
                  const percent = Math.round((p.sold / maxSold) * 100);
                  const rankBadge =
                    i === 0
                      ? "bg-amber-100 text-amber-800 border-amber-300"
                      : i === 1
                      ? "bg-slate-200 text-slate-800 border-slate-300"
                      : i === 2
                      ? "bg-amber-700/10 text-amber-900 border-amber-700/20"
                      : "bg-slate-100 text-slate-600 border-slate-200";

                  return (
                    <div
                      key={i}
                      className="p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition"
                    >
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className={`w-5 h-5 rounded-full border flex items-center justify-center text-[10px] font-bold shrink-0 ${rankBadge}`}
                          >
                            {i + 1}
                          </span>
                          <span className="font-semibold text-sm text-slate-900 truncate">
                            {p.name}
                          </span>
                        </div>
                        <span className="text-xs font-bold text-slate-900 shrink-0">
                          {p.sold} terjual
                        </span>
                      </div>

                      {/* Progress bar perbandingan */}
                      <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mb-1.5">
                        <div
                          className="bg-blue-600 h-full rounded-full transition-all duration-500"
                          style={{ width: `${percent}%` }}
                        />
                      </div>

                      <div className="flex justify-between items-center text-xs text-slate-500">
                        <span>Rp {Number(p.price).toLocaleString("id-ID")}</span>
                        <span className="font-semibold text-slate-700">
                          Rp {(p.sold * p.price).toLocaleString("id-ID")}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* === SHORTCUT MENU CEPAT === */}
      <div>
        <h2 className="text-base font-semibold text-slate-900 mb-3">Akses Menu Cepat</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <QuickActionLink
            href="/pos"
            title="Kasir POS"
            desc="Input penjualan toko"
            icon={<ShoppingCart className="w-5 h-5 text-emerald-600" />}
            color="hover:border-emerald-300"
          />
          <QuickActionLink
            href="/admin/products"
            title="Kelola Produk"
            desc="Stok, harga, barcode"
            icon={<Package className="w-5 h-5 text-indigo-600" />}
            color="hover:border-indigo-300"
          />
          <QuickActionLink
            href="/invoices"
            title="Faktur Penjualan"
            desc="Cek tagihan & pelunasan"
            icon={<FileText className="w-5 h-5 text-blue-600" />}
            color="hover:border-blue-300"
          />
          <QuickActionLink
            href="/warehouse/stock"
            title="Stok Gudang"
            desc="Pantau inventaris barang"
            icon={<Layers className="w-5 h-5 text-amber-600" />}
            color="hover:border-amber-300"
          />
        </div>
      </div>
    </div>
  );
}

// ====== Komponen Kartu Statistik Modern ======
function StatCard({
  title,
  value,
  subtitle,
  icon,
  iconBg,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  iconBg: string;
  accent?: string;
}) {
  return (
    <Card className="hover:-translate-y-0.5 transition-transform duration-200">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            {title}
          </span>
          <div className={`p-2.5 rounded-xl border ${iconBg}`}>
            {icon}
          </div>
        </div>
        <div className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
          {value}
        </div>
        {subtitle && (
          <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
            <span>{subtitle}</span>
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ====== Shortcut Menu ======
function QuickActionLink({
  href,
  title,
  desc,
  icon,
  color,
}: {
  href: string;
  title: string;
  desc: string;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <Link
      href={href}
      target={href === "/pos" ? "_blank" : undefined}
      rel={href === "/pos" ? "noopener noreferrer" : undefined}
      className={`group p-4 bg-white border border-slate-200/80 rounded-2xl shadow-xs transition-all duration-150 hover:shadow-md ${color} active:scale-[0.98] flex flex-col justify-between`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="p-2 rounded-xl bg-slate-50 border border-slate-100 group-hover:scale-105 transition-transform">
          {icon}
        </div>
        <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-slate-600 transition-colors" />
      </div>
      <div>
        <h3 className="font-semibold text-sm text-slate-900 group-hover:text-blue-700 transition-colors">
          {title}
        </h3>
        <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{desc}</p>
      </div>
    </Link>
  );
}
