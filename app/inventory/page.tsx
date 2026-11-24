"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  History,
  Layers,
  Loader2,
  Package,
  Warehouse,
  XCircle,
} from "lucide-react";
import BrandLoader from "@/components/BrandLoader";
import { Badge } from "@/components/ui/badge";

interface LocationOption {
  id: number;
  name: string;
}

interface LowProduct {
  id: number;
  name: string;
  sku: string;
  stock: number;
  minStock: number;
}

interface Summary {
  location: { id: number; name: string } | null;
  totalProducts: number;
  stockProducts: number;
  totalUnits: number;
  availableCount: number;
  lowCount: number;
  outCount: number;
  configuredCount: number;
  lowProducts: LowProduct[];
}

const emptySummary: Summary = {
  location: null,
  totalProducts: 0,
  stockProducts: 0,
  totalUnits: 0,
  availableCount: 0,
  lowCount: 0,
  outCount: 0,
  configuredCount: 0,
  lowProducts: [],
};

export default function InventorySummaryPage() {
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [locationId, setLocationId] = useState<number | null>(null);
  const [summary, setSummary] = useState<Summary>(emptySummary);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/locations")
      .then((response) => response.json())
      .then((data) => {
        const rows: LocationOption[] = Array.isArray(data) ? data : [];
        setLocations(rows);
        setLocationId((current) => current ?? rows[0]?.id ?? null);
      })
      .catch(() => setLocations([]));
  }, []);

  const loadSummary = useCallback(async () => {
    if (locationId === null) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const response = await fetch(
        `/api/inventory/summary?locationId=${locationId}`
      );
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error || "Gagal memuat ringkasan persediaan.");
      }
      setSummary(body);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Gagal memuat ringkasan persediaan."
      );
    } finally {
      setLoading(false);
    }
  }, [locationId]);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  if (loading && summary.location === null) {
    return <BrandLoader label="Memuat ringkasan persediaan..." />;
  }

  const cards = [
    {
      label: "Total Produk",
      value: summary.totalProducts,
      icon: Package,
      tone: "bg-blue-50 text-blue-600",
    },
    {
      label: "Total Unit",
      value: summary.totalUnits.toLocaleString("id-ID"),
      icon: Layers,
      tone: "bg-indigo-50 text-indigo-600",
    },
    {
      label: "Stok Tersedia",
      value: summary.availableCount,
      icon: CheckCircle2,
      tone: "bg-emerald-50 text-emerald-600",
    },
    {
      label: "Stok Menipis",
      value: summary.lowCount,
      icon: AlertTriangle,
      tone: "bg-amber-50 text-amber-600",
    },
    {
      label: "Stok Habis",
      value: summary.outCount,
      icon: XCircle,
      tone: "bg-rose-50 text-rose-600",
    },
    {
      label: "Minimum Terpasang",
      value: summary.configuredCount,
      icon: ClipboardList,
      tone: "bg-slate-100 text-slate-600",
    },
  ];

  return (
    <div className="mx-auto w-full max-w-screen-2xl space-y-6 px-4 py-8 sm:px-8 xl:px-10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            <ClipboardList className="h-6 w-6 text-indigo-600" />
            Ringkasan Persediaan
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Kondisi stok, peringatan minimum, dan akses cepat ke pengelolaan
            persediaan.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-xs">
            <Warehouse className="h-4 w-4 text-slate-400" />
            <select
              value={locationId ?? ""}
              onChange={(event) => setLocationId(Number(event.target.value))}
              className="bg-transparent text-sm font-medium text-slate-700 focus:outline-none"
              aria-label="Pilih gudang"
            >
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => void loadSummary()}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-700 shadow-xs transition hover:bg-slate-50"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <History className="h-4 w-4" />
            )}
            Muat ulang
          </button>
        </div>
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700"
        >
          {error}
        </p>
      )}

      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-3 xl:grid-cols-6">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs"
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-slate-500">{card.label}</p>
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-xl ${card.tone}`}
                >
                  <Icon className="h-4 w-4" />
                </span>
              </div>
              <p className="mt-2 text-2xl font-bold text-slate-900">
                {card.value}
              </p>
            </div>
          );
        })}
      </div>

      {summary.configuredCount === 0 && (
        <div className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50/70 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-amber-800">
            Belum ada minimum stok untuk gudang ini. Peringatan stok menipis
            baru aktif setelah batas minimum diatur.
          </p>
          <Link
            href="/inventory/minimum-stock"
            className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-amber-600 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-amber-700"
          >
            Atur Minimum Stok
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs lg:col-span-2">
          <div className="flex items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Produk di bawah minimum
            </h2>
            <Badge variant={summary.lowCount > 0 ? "warning" : "success"} withDot>
              {summary.lowCount} produk
            </Badge>
          </div>
          <div className="mt-3 divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200">
            {summary.lowProducts.map((product) => (
              <div
                key={product.id}
                className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-slate-800">
                    {product.name}
                  </p>
                  <p className="font-mono text-xs text-slate-400">
                    {product.sku}
                  </p>
                </div>
                <div className="shrink-0 text-right text-xs">
                  <p className="font-bold text-amber-600">
                    {product.stock} / min {product.minStock}
                  </p>
                  <p className="text-slate-400">stok saat ini</p>
                </div>
              </div>
            ))}
            {summary.lowProducts.length === 0 && (
              <p className="px-3 py-6 text-center text-sm text-slate-500">
                Tidak ada produk di bawah minimum stok.
              </p>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
          <h2 className="text-sm font-semibold text-slate-900">
            Akses cepat
          </h2>
          <div className="mt-3 space-y-2">
            {[
              {
                href: "/inventory/stock",
                label: "Stok Produk",
                description: "Lihat stok per gudang & penyesuaian",
                icon: Layers,
              },
              {
                href: "/inventory/minimum-stock",
                label: "Minimum Stok",
                description: "Atur batas per produk per gudang",
                icon: AlertTriangle,
              },
              {
                href: "/inventory/adjustments",
                label: "Riwayat Penyesuaian",
                description: "Jejak koreksi stok",
                icon: History,
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-2.5 transition hover:border-indigo-200 hover:bg-indigo-50/40"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-slate-800">
                      {item.label}
                    </span>
                    <span className="block truncate text-xs text-slate-500">
                      {item.description}
                    </span>
                  </span>
                  <ArrowRight className="ml-auto h-4 w-4 shrink-0 text-slate-400" />
                </Link>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
