"use client";

import { useEffect, useState } from "react";
import { Coins, Package, Shirt, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
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

// ====== Komponen Utama ======
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
                new Date(s.createdAt ?? Date.now()).toLocaleDateString("id-ID"),
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

  if (loading)
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <div className="backdrop-blur-md bg-white/10 p-6 rounded-2xl shadow-lg border border-gray-300/30">
          <div className="w-8 h-8 border-4 border-gray-800 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-sm text-gray-700">Memuat Dashbord...</p>
        </div>
      </div>
    );

  if (error) return <div className="p-4 text-red-600">{error}</div>;
  if (!data) return null;

  const { stats, sales, topProducts } = data;

  return (
    <div className="p-6 space-y-8 bg-gradient-to-br from-gray-100 to-gray-200 min-h-screen">
      {/* === Statistik Singkat === */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Produk"
          value={stats.totalProducts}
          icon={<Package />}
        />
        <StatCard
          title="Kategori Produk"
          value={stats.totalCategories}
          icon={<Shirt />}
        />
        <StatCard
          title="Pelanggan"
          value={stats.totalCustomers}
          icon={<Users />}
        />
        <StatCard
          title="Pendapatan (Paid)"
          value={`Rp ${Number(stats.totalRevenue).toLocaleString("id-ID")}`}
          icon={<Coins size={24} />}
        />
      </div>

      {/* === Grafik Penjualan === */}
      <Card className="backdrop-blur-lg bg-white/60 shadow-xl border border-gray-300/40">
        <CardHeader>
          <CardTitle>Penjualan 7 Hari Terakhir</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={sales}>
              <XAxis dataKey="date" stroke="#555" />
              <YAxis stroke="#555" />
              <Tooltip />
              <Bar
                dataKey="total"
                fill="#1f2937" // abu gelap
                radius={[6, 6, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* === Produk Terlaris Hari Ini === */}
      <Card className="backdrop-blur-lg bg-white/60 shadow-xl border border-gray-300/40">
        <CardHeader>
          <CardTitle>Produk Terlaris Hari Ini</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-400">
                <th className="text-left py-2">Produk</th>
                <th className="text-right">Terjual</th>
                <th className="text-right">Harga</th>
              </tr>
            </thead>
            <tbody>
              {topProducts.length === 0 ? (
                <tr>
                  <td
                    colSpan={3}
                    className="py-6 text-center text-gray-500 italic"
                  >
                    Belum ada produk yang terjual hari ini
                  </td>
                </tr>
              ) : (
                topProducts.map((p, i) => (
                  <tr
                    key={i}
                    className="border-b border-gray-300 hover:bg-gray-100/70 transition-all"
                  >
                    <td className="py-2 font-medium text-gray-800">{p.name}</td>
                    <td className="text-right text-gray-700">{p.sold}</td>
                    <td className="text-right text-gray-700">
                      Rp {Number(p.price).toLocaleString("id-ID")}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

// ====== Komponen Kartu Statistik ======
function StatCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
}) {
  return (
    <Card className="backdrop-blur-lg bg-white/70 shadow-xl border border-gray-300/40 hover:bg-gray-100/70 transition">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-gray-700">
          {title}
        </CardTitle>
        <div className="text-gray-600">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-gray-900">{value}</div>
      </CardContent>
    </Card>
  );
}
