"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, MonitorSmartphone, Warehouse } from "lucide-react";
import BrandLoader from "@/components/BrandLoader";
import RegisterManager from "@/components/pos/back-office/RegisterManager";

interface Outlet {
  id: number;
  name: string;
  address?: string | null;
  isActive: boolean;
}

/**
 * Pengaturan mesin kasir per outlet.
 * Berada di bagian Gudang karena setiap mesin terikat pada satu gudang stok.
 * Logika CRUD direuse dari RegisterManager (dipakai juga di halaman Lokasi).
 */
export default function RegisterSettingsPage() {
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadOutlets = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/locations");
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error || "Gagal memuat outlet.");
      }
      const rows: Outlet[] = Array.isArray(body) ? body : [];
      setOutlets(rows);
      setSelectedId((current) => {
        if (current !== null && rows.some((outlet) => outlet.id === current)) {
          return current;
        }
        return rows.find((outlet) => outlet.isActive)?.id ?? rows[0]?.id ?? null;
      });
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "Gagal memuat outlet."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOutlets();
  }, [loadOutlets]);

  if (loading) return <BrandLoader label="Memuat pengaturan mesin kasir..." />;

  return (
    <div className="mx-auto w-full max-w-screen-2xl space-y-6 px-4 py-8 sm:px-8 xl:px-10">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          <MonitorSmartphone className="h-6 w-6 text-indigo-600" />
          Mesin Kasir
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Daftarkan mesin kasir per outlet dan tentukan gudang stok yang dipakai
          saat bertransaksi.
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"
        >
          {error}
          <button
            type="button"
            onClick={() => void loadOutlets()}
            className="ml-3 font-semibold underline"
          >
            Coba lagi
          </button>
        </div>
      )}

      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
          <Warehouse className="h-4 w-4 text-indigo-500" />
          Pilih outlet
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {outlets.map((outlet) => {
            const isSelected = selectedId === outlet.id;
            return (
              <button
                key={outlet.id}
                type="button"
                onClick={() => setSelectedId(outlet.id)}
                className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition sm:text-sm ${
                  isSelected
                    ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/30"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {outlet.name}
                {!outlet.isActive && (
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] ${
                      isSelected
                        ? "bg-white/20 text-white"
                        : "bg-slate-200 text-slate-500"
                    }`}
                  >
                    Nonaktif
                  </span>
                )}
              </button>
            );
          })}
          {outlets.length === 0 && (
            <p className="text-sm text-slate-500">
              Belum ada outlet. Tambahkan lokasi terlebih dahulu di menu Lokasi
              Gudang.
            </p>
          )}
        </div>
      </div>

      {selectedId !== null ? (
        <RegisterManager
          outletId={selectedId}
          outlets={outlets.map((outlet) => ({
            id: outlet.id,
            name: outlet.name,
            isActive: outlet.isActive,
          }))}
        />
      ) : (
        <p className="flex items-center gap-2 rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-sm text-slate-500">
          <Loader2 className="h-4 w-4" />
          Pilih outlet untuk mengelola mesin kasir.
        </p>
      )}
    </div>
  );
}
