"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  History,
  Loader2,
  Search,
  Warehouse,
} from "lucide-react";
import BrandLoader from "@/components/BrandLoader";
import Button from "@/components/Button";
import Modal from "@/components/Modal";
import { Badge } from "@/components/ui/badge";

interface LocationOption {
  id: number;
  name: string;
}

interface AdjustmentItemRow {
  id: number;
  productId: number;
  name: string;
  sku: string;
  oldQuantity: number;
  newQuantity: number;
  difference: number;
}

interface AdjustmentRow {
  id: number;
  no: string;
  date: string;
  note: string | null;
  location: { id: number; name: string };
  itemCount: number;
  increase: number;
  decrease: number;
  net: number;
  items: AdjustmentItemRow[];
}

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  });

const todayStr = () => new Date().toISOString().slice(0, 10);

export default function AdjustmentHistoryPage() {
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [locationId, setLocationId] = useState<string>("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [rows, setRows] = useState<AdjustmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<AdjustmentRow | null>(null);

  useEffect(() => {
    fetch("/api/locations")
      .then((response) => response.json())
      .then((data) => setLocations(Array.isArray(data) ? data : []))
      .catch(() => setLocations([]));
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search), 400);
    return () => window.clearTimeout(timer);
  }, [search]);

  const loadAdjustments = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (locationId !== "all") params.set("locationId", locationId);
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      if (debouncedSearch.trim()) params.set("q", debouncedSearch.trim());

      const response = await fetch(
        `/api/warehouse/adjustments?${params.toString()}`
      );
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error || "Gagal memuat riwayat penyesuaian.");
      }
      setRows(Array.isArray(body) ? body : []);
    } catch (loadError) {
      setRows([]);
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Gagal memuat riwayat penyesuaian."
      );
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, from, locationId, to]);

  useEffect(() => {
    void loadAdjustments();
  }, [loadAdjustments]);

  const summary = useMemo(() => {
    return rows.reduce(
      (acc, row) => ({
        adjustments: acc.adjustments + 1,
        increase: acc.increase + row.increase,
        decrease: acc.decrease + row.decrease,
      }),
      { adjustments: 0, increase: 0, decrease: 0 }
    );
  }, [rows]);

  if (loading && rows.length === 0) {
    return <BrandLoader label="Memuat riwayat penyesuaian..." />;
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
            <History className="h-6 w-6 text-indigo-600" />
            Riwayat Penyesuaian Stok
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Jejak koreksi stok per gudang beserta selisihnya.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/inventory/stock"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-700 shadow-xs transition hover:bg-slate-50"
          >
            <Warehouse className="h-4 w-4" />
            Stok Produk
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
          <p className="text-xs font-medium text-slate-500">Penyesuaian</p>
          <p className="mt-1 text-xl font-bold text-slate-900">
            {summary.adjustments}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
          <p className="text-xs font-medium text-emerald-600">Total Masuk</p>
          <p className="mt-1 text-xl font-bold text-emerald-600">
            +{summary.increase}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
          <p className="text-xs font-medium text-rose-600">Total Keluar</p>
          <p className="mt-1 text-xl font-bold text-rose-600">
            −{summary.decrease}
          </p>
        </div>
      </div>

      <div className="space-y-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
        <div className="grid gap-3 md:grid-cols-4">
          <label className="text-xs font-semibold text-slate-600">
            Gudang
            <select
              value={locationId}
              onChange={(event) => setLocationId(event.target.value)}
              className="form-control mt-1.5"
            >
              <option value="all">Semua gudang</option>
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-semibold text-slate-600">
            Dari tanggal
            <input
              type="date"
              value={from}
              max={to || todayStr()}
              onChange={(event) => setFrom(event.target.value)}
              className="form-control mt-1.5"
            />
          </label>
          <label className="text-xs font-semibold text-slate-600">
            Sampai tanggal
            <input
              type="date"
              value={to}
              min={from || undefined}
              onChange={(event) => setTo(event.target.value)}
              className="form-control mt-1.5"
            />
          </label>
          <label className="text-xs font-semibold text-slate-600">
            Pencarian
            <div className="relative mt-1.5">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Nomor, catatan, produk, SKU"
                className="form-control w-full pl-9"
              />
            </div>
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <Calendar className="h-3.5 w-3.5" />
          {from || to ? (
            <span>
              {from ? new Date(from).toLocaleDateString("id-ID") : "Awal"} —{" "}
              {to ? new Date(to).toLocaleDateString("id-ID") : "Sekarang"}
            </span>
          ) : (
            <span>Semua tanggal</span>
          )}
          <button
            type="button"
            onClick={() => {
              setLocationId("all");
              setFrom("");
              setTo("");
              setSearch("");
            }}
            className="ml-auto font-semibold text-indigo-600 hover:underline"
          >
            Reset filter
          </button>
        </div>
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700"
        >
          {error}
          <button
            type="button"
            onClick={() => void loadAdjustments()}
            className="ml-3 font-semibold underline"
          >
            Coba lagi
          </button>
        </p>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Nomor</th>
                <th className="px-4 py-3">Tanggal</th>
                <th className="px-4 py-3">Gudang</th>
                <th className="px-4 py-3">Catatan</th>
                <th className="px-4 py-3 text-right">Item</th>
                <th className="px-4 py-3 text-right">Masuk</th>
                <th className="px-4 py-3 text-right">Keluar</th>
                <th className="px-4 py-3 text-right">Net</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50/70">
                  <td className="px-4 py-3 font-mono text-xs text-slate-700">
                    {row.no}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {formatDateTime(row.date)}
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-800">
                    {row.location.name}
                  </td>
                  <td className="max-w-[240px] truncate px-4 py-3 text-slate-500">
                    {row.note || "-"}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-600">
                    {row.itemCount}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-emerald-600">
                    {row.increase > 0 ? `+${row.increase}` : "-"}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-rose-600">
                    {row.decrease > 0 ? `−${row.decrease}` : "-"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span
                      className={`font-bold ${
                        row.net > 0
                          ? "text-emerald-700"
                          : row.net < 0
                          ? "text-rose-700"
                          : "text-slate-500"
                      }`}
                    >
                      {row.net > 0 ? `+${row.net}` : row.net}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => setSelected(row)}
                      className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      Detail
                    </button>
                  </td>
                </tr>
              ))}
              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-sm text-slate-500">
                    Tidak ada penyesuaian pada filter ini.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {loading && rows.length > 0 && (
          <p className="flex items-center gap-2 border-t border-slate-100 px-4 py-2 text-xs text-slate-500">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Memuat ulang...
          </p>
        )}
      </div>

      <Modal
        isOpen={selected !== null}
        onClose={() => setSelected(null)}
        title={selected ? `Penyesuaian ${selected.no}` : "Detail Penyesuaian"}
        description={
          selected
            ? `${selected.location.name} · ${formatDateTime(selected.date)}`
            : undefined
        }
      >
        {selected && (
          <div className="space-y-4">
            {selected.note && (
              <p className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600">
                <span className="font-semibold text-slate-700">Alasan: </span>
                {selected.note}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <Badge variant="success">Masuk +{selected.increase}</Badge>
              <Badge variant="danger">Keluar −{selected.decrease}</Badge>
              <Badge variant="info">Net {selected.net > 0 ? `+${selected.net}` : selected.net}</Badge>
            </div>
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-3 py-2">Produk</th>
                    <th className="px-3 py-2">SKU</th>
                    <th className="px-3 py-2 text-center">Awal</th>
                    <th className="px-3 py-2 text-center">Akhir</th>
                    <th className="px-3 py-2 text-center">Selisih</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selected.items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-3 py-2 font-medium text-slate-800">
                        {item.name}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs text-slate-500">
                        {item.sku}
                      </td>
                      <td className="px-3 py-2 text-center text-slate-600">
                        {item.oldQuantity}
                      </td>
                      <td className="px-3 py-2 text-center font-semibold text-slate-800">
                        {item.newQuantity}
                      </td>
                      <td
                        className={`px-3 py-2 text-center font-bold ${
                          item.difference > 0
                            ? "text-emerald-600"
                            : item.difference < 0
                            ? "text-rose-600"
                            : "text-slate-500"
                        }`}
                      >
                        {item.difference > 0 ? `+${item.difference}` : item.difference}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end">
              <Button variant="secondary" onClick={() => setSelected(null)}>
                Tutup
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
