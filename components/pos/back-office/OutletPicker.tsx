"use client";

import { useMemo, useState } from "react";
import {
  Building2,
  Check,
  MapPin,
  Search,
  Warehouse,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export interface OutletOption {
  id: number;
  name: string;
  address?: string | null;
  isActive: boolean;
}

interface OutletPickerProps {
  outlets: OutletOption[];
  selectedId: number | null;
  onSelect: (id: number) => void;
}

/**
 * Langkah 1 Cashier Back Office: memilih outlet.
 * Memakai pola kartu + pencarian yang sama dengan halaman Lokasi Gudang
 * agar konsisten dengan design system aplikasi.
 */
export default function OutletPicker({
  outlets,
  selectedId,
  onSelect,
}: OutletPickerProps) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return outlets;
    return outlets.filter(
      (outlet) =>
        outlet.name.toLowerCase().includes(query) ||
        (outlet.address || "").toLowerCase().includes(query)
    );
  }, [outlets, search]);

  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
            <Building2 className="h-4 w-4 text-blue-600" />
            1. Pilih outlet
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Pilih lokasi tempat Anda bertugas sebelum memilih mesin kasir.
          </p>
        </div>
        <Badge variant="info">{outlets.length} outlet</Badge>
      </div>

      <div className="relative mt-4">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Cari nama atau alamat outlet..."
          aria-label="Cari outlet"
          className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-9 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch("")}
            aria-label="Hapus pencarian"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {filtered.map((outlet) => {
          const isSelected = selectedId === outlet.id;
          return (
            <button
              key={outlet.id}
              type="button"
              disabled={!outlet.isActive}
              onClick={() => onSelect(outlet.id)}
              className={`flex w-full items-start gap-3 rounded-xl border p-3.5 text-left transition ${
                isSelected
                  ? "border-blue-500 bg-blue-50/70 ring-1 ring-blue-500/30"
                  : "border-slate-200 bg-white hover:border-blue-200 hover:bg-slate-50"
              } ${!outlet.isActive ? "cursor-not-allowed opacity-60" : ""}`}
            >
              <span
                className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                  isSelected
                    ? "bg-blue-600 text-white"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                {isSelected ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Warehouse className="h-4 w-4" />
                )}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-slate-900">
                  {outlet.name}
                </span>
                <span className="mt-0.5 flex items-start gap-1 text-xs text-slate-500">
                  <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
                  <span className="line-clamp-2">
                    {outlet.address || "Tanpa alamat"}
                  </span>
                </span>
                {!outlet.isActive && (
                  <span className="mt-1 inline-block text-xs font-semibold text-rose-600">
                    Nonaktif
                  </span>
                )}
              </span>
            </button>
          );
        })}
        {filtered.length === 0 && (
          <p className="col-span-full rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
            Tidak ada outlet yang cocok dengan pencarian.
          </p>
        )}
      </div>
    </section>
  );
}
