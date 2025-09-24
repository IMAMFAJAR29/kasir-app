"use client";

import { useSession } from "next-auth/react";
import { Loader2, Package, Layers, ShoppingCart } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function Home() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white/70 backdrop-blur-sm z-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
          <p className="text-gray-600 font-medium">Memuat dashboard...</p>
        </div>
      </div>
    );
  }

  if (!session) return <p>Unauthorized</p>;

  // Dummy data untuk stat cards
  const stats = [
    {
      id: 1,
      label: "Total Produk",
      value: 120,
      icon: Package,
      color: "text-blue-600",
    },
    {
      id: 2,
      label: "Total Kategori",
      value: 8,
      icon: Layers,
      color: "text-green-600",
    },
    {
      id: 3,
      label: "Penjualan Hari Ini",
      value: "Rp 2.500.000",
      icon: ShoppingCart,
      color: "text-purple-600",
    },
  ];

  // Dummy data untuk grafik penjualan
  const salesData = [
    { day: "Sen", sales: 400 },
    { day: "Sel", sales: 600 },
    { day: "Rab", sales: 800 },
    { day: "Kam", sales: 200 },
    { day: "Jum", sales: 1000 },
    { day: "Sab", sales: 700 },
    { day: "Min", sales: 900 },
  ];

  return (
    <main className="p-8 max-w-6xl mx-auto">
      {/* Welcome */}
      <p className="text-gray-600 mb-8 dark:text-gray-300">
        Selamat datang{" "}
        <span className="font-semibold">
          {session.user.name || session.user.email}
        </span>{" "}
        di aplikasi POS sederhana Saya.
      </p>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.id}
              className="bg-gray-50 border border-gray-300 text-gray-900 rounded-lg 
                         shadow-sm p-6 flex items-center gap-4 
                         dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              <Icon className={`w-10 h-10 ${stat.color}`} />
              <div>
                <p className="text-gray-600 dark:text-gray-300">{stat.label}</p>
                <h2 className="text-2xl font-bold">{stat.value}</h2>
              </div>
            </div>
          );
        })}
      </div>

      {/* Grafik Penjualan */}
      <div
        className="bg-gray-50 border border-gray-300 text-gray-900 rounded-lg 
                   shadow-sm p-6 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
      >
        <h2 className="text-xl font-semibold mb-4">
          Penjualan 7 Hari Terakhir
        </h2>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={salesData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="sales"
                stroke="#4f46e5"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </main>
  );
}
