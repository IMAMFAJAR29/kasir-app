"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Package,
  Save,
  Search,
  XCircle,
} from "lucide-react";
import Swal from "sweetalert2";
import BrandLoader from "@/components/BrandLoader";
import Button from "@/components/Button";
import { Badge } from "@/components/ui/badge";

interface LocationOption {
  id: number;
  name: string;
}

interface CategoryOption {
  id: number;
  name: string;
}

interface StockRow {
  id: number;
  productId: number;
  name: string;
  sku: string;
  categoryId: number | null;
  categoryName: string | null;
  isBundle: boolean;
  stock: number;
  minStock: number;
}

export default function MinimumStockPage() {
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [locationId, setLocationId] = useState<number | null>(null);
  const [rows, setRows] = useState<StockRow[]>([]);
  const [draft, setDraft] = useState<Record<number, number>>({});
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/locations").then((response) => response.json()),
      fetch("/api/categories").then((response) => response.json()),
    ])
      .then(([locationData, categoryData]) => {
        const locationRows: LocationOption[] = Array.isArray(locationData)
          ? locationData
          : [];
        setLocations(locationRows);
        setCategories(Array.isArray(categoryData) ? categoryData : []);
        setLocationId((current) => current ?? locationRows[0]?.id ?? null);
      })
      .catch(() => setLocations([]));
  }, []);

  const loadStock = useCallback(async () => {
    if (locationId === null) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const response = await fetch(
        `/api/warehouse/stock?locationId=${locationId}`
      );
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error || "Gagal memuat stok gudang.");
      }
      const data: StockRow[] = Array.isArray(body) ? body : [];
      setRows(data);
      setDraft(
        Object.fromEntries(data.map((row) => [row.id, row.minStock ?? 0]))
      );
    } catch (loadError) {
      setRows([]);
      setDraft({});
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Gagal memuat stok gudang."
      );
    } finally {
      setLoading(false);
    }
  }, [locationId]);

  useEffect(() => {
    void loadStock();
  }, [loadStock]);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesSearch =
        !query ||
        row.name.toLowerCase().includes(query) ||
        row.sku.toLowerCase().includes(query);
      const matchesCategory =
        filterCategory === "all" || String(row.categoryId ?? "") === filterCategory;
      return matchesSearch && matchesCategory;
    });
  }, [filterCategory, rows, search]);

  const summary = useMemo(() => {
    let configured = 0;
    let low = 0;
    let out = 0;
    for (const row of rows) {
      if (row.isBundle) continue;
      const min = draft[row.id] ?? 0;
      if (min > 0) configured += 1;
      if (row.stock <= 0) out += 1;
      else if (min > 0 && row.stock <= min) low += 1;
    }
    return { configured, low, out };
  }, [draft, rows]);

  const updateMin = (productId: number, value: string) => {
    setDraft((current) => ({
      ...current,
      [productId]: value === "" ? 0 : Number(value),
    }));
  };

  const handleSave = async () => {
    if (locationId === null || saving) return;
    const invalid = rows.find(
      (row) =>
        !row.isBundle &&
        (!Number.isSafeInteger(draft[row.id] ?? 0) || (draft[row.id] ?? 0) < 0)
    );
    if (invalid) {
      await Swal.fire(
        "Nilai tidak valid",
        `Minimum stok ${invalid.name} harus bilangan bulat 0 atau lebih.`,
        "warning"
      );
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/inventory/minimum-stock", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locationId,
          items: rows
            .filter((row) => !row.isBundle)
            .map((row) => ({
              productId: row.productId,
              minStock: draft[row.id] ?? 0,
            })),
        }),
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error || "Gagal menyimpan minimum stok.");
      }
      await loadStock();
      await Swal.fire(
        "Tersimpan",
        "Minimum stok berhasil diperbarui.",
        "success"
      );
    } catch (saveError) {
      await Swal.fire(
        "Gagal menyimpan",
        saveError instanceof Error ? saveError.message : "Terjadi kesalahan.",
        "error"
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading && rows.length === 0) {
    return <BrandLoader label="Memuat minimum stok..." />;
  }

  return (
    <div className="mx-auto w-full max-w-screen-2xl space-y-6 px-4 py-8 sm:px-8 xl:px-10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            href="/inventory/stock"
            className="mb-2 inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 transition hover:text-slate-800"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Kembali ke Stok Produk
          </Link>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            <AlertTriangle className="h-6 w-6 text-amber-500" />
            Minimum Stok
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Atur batas minimum per produk untuk setiap gudang. Nilai 0 berarti
            tanpa peringatan.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-xs">
            <span className="text-slate-400">Gudang</span>
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
          <Button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {saving ? "Menyimpan..." : "Simpan Minimum"}
          </Button>
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

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
          <p className="text-xs font-medium text-slate-500">Minimum Terpasang</p>
          <p className="mt-1 text-xl font-bold text-slate-900">
            {summary.configured}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
          <p className="text-xs font-medium text-amber-600">Stok Menipis</p>
          <p className="mt-1 text-xl font-bold text-amber-600">{summary.low}</p>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
          <p className="text-xs font-medium text-rose-600">Stok Habis</p>
          <p className="mt-1 text-xl font-bold text-rose-600">{summary.out}</p>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cari nama produk atau SKU..."
            className="form-control w-full pl-10"
          />
        </div>
        <select
          value={filterCategory}
          onChange={(event) => setFilterCategory(event.target.value)}
          aria-label="Filter kategori"
          className="form-control sm:w-56"
        >
          <option value="all">Semua kategori</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Produk</th>
                <th className="px-4 py-3">Kategori</th>
                <th className="px-4 py-3 text-center">Stok Saat Ini</th>
                <th className="px-4 py-3 text-center">Minimum Stok</th>
                <th className="px-4 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRows.map((row) => {
                const min = draft[row.id] ?? 0;
                const isLow = min > 0 && row.stock > 0 && row.stock <= min;
                const isOut = row.stock <= 0;
                return (
                  <tr key={row.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-100 text-slate-400">
                          <Package className="h-4 w-4" />
                        </span>
                        <div className="min-w-0">
                          <p className="flex items-center gap-1.5 truncate font-semibold text-slate-900">
                            {row.name}
                            {row.isBundle && (
                              <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-indigo-700">
                                Bundle
                              </span>
                            )}
                          </p>
                          <p className="font-mono text-xs text-slate-400">
                            {row.sku}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {row.categoryName || "-"}
                    </td>
                    <td className="px-4 py-3 text-center font-semibold text-slate-700">
                      {row.stock}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {row.isBundle ? (
                        <span className="text-xs text-slate-400">Turunan</span>
                      ) : (
                        <input
                          type="number"
                          min={0}
                          step={1}
                          value={draft[row.id] ?? 0}
                          onChange={(event) =>
                            updateMin(row.id, event.target.value)
                          }
                          className="w-24 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-center text-sm font-semibold text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        />
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {row.isBundle ? (
                        <Badge variant="default">-</Badge>
                      ) : isOut ? (
                        <Badge variant="danger" withDot>
                          Habis
                        </Badge>
                      ) : isLow ? (
                        <Badge variant="warning" withDot>
                          Menipis
                        </Badge>
                      ) : (
                        <Badge variant="success" withDot>
                          Aman
                        </Badge>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filteredRows.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-12 text-center text-sm text-slate-500"
                  >
                    Tidak ada produk pada filter ini.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
        <span className="inline-flex items-center gap-1.5">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Stok di atas minimum
        </span>
        <span className="inline-flex items-center gap-1.5">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-500" /> Stok ≤ minimum
        </span>
        <span className="inline-flex items-center gap-1.5">
          <XCircle className="h-3.5 w-3.5 text-rose-500" /> Stok habis
        </span>
      </div>
    </div>
  );
}
