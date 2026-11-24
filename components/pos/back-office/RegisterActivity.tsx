"use client";

import { useEffect, useState } from "react";
import { History, Loader2, Receipt } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ShiftRow {
  id: string;
  cashier: { id: string; name: string };
  openedAt: string;
  closedAt: string | null;
  openingCash: number;
  closingCash: number | null;
}

interface SaleRow {
  id: number;
  total: number;
  method: string;
  createdAt: string;
  cashier: { id: string; name: string } | null;
}

interface RegisterActivityProps {
  registerId: number;
}

const currency = (value: number) => `Rp ${value.toLocaleString("id-ID")}`;
const formatDateTime = (value: string) =>
  new Date(value).toLocaleString("id-ID", {
    dateStyle: "short",
    timeStyle: "short",
  });

/**
 * Riwayat aktivitas terakhir mesin kasir.
 * Datanya diturunkan dari CashSession + Sale, tanpa tabel audit baru.
 */
export default function RegisterActivity({ registerId }: RegisterActivityProps) {
  const [shifts, setShifts] = useState<ShiftRow[]>([]);
  const [sales, setSales] = useState<SaleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    fetch(`/api/pos-registers/${registerId}`)
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) {
          throw new Error(body.error || "Gagal memuat riwayat mesin.");
        }
        if (cancelled) return;
        setShifts(body.shifts ?? []);
        setSales(body.recentSales ?? []);
      })
      .catch((loadError) => {
        if (cancelled) return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Gagal memuat riwayat mesin."
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [registerId]);

  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
      <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
        <History className="h-4 w-4 text-blue-600" />
        Riwayat aktivitas mesin
      </h2>
      <p className="mt-1 text-xs text-slate-500">
        Lima shift dan transaksi terakhir pada mesin ini.
      </p>

      {loading && (
        <p className="mt-4 flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Memuat riwayat...
        </p>
      )}

      {error && !loading && (
        <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </p>
      )}

      {!loading && !error && (
        <div className="mt-4 space-y-4">
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Shift terakhir
            </p>
            <div className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200">
              {shifts.map((shift) => (
                <div
                  key={shift.id}
                  className="flex items-center justify-between gap-3 px-3 py-2.5 text-xs"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-800">
                      {shift.cashier.name}
                    </p>
                    <p className="text-slate-500">
                      {formatDateTime(shift.openedAt)}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge
                      variant={shift.closedAt ? "default" : "success"}
                      withDot
                    >
                      {shift.closedAt ? "Ditutup" : "Aktif"}
                    </Badge>
                    <p className="mt-1 text-slate-500">
                      Modal {currency(shift.openingCash)}
                    </p>
                  </div>
                </div>
              ))}
              {shifts.length === 0 && (
                <p className="px-3 py-4 text-center text-xs text-slate-500">
                  Belum ada shift pada mesin ini.
                </p>
              )}
            </div>
          </div>

          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Transaksi terakhir
            </p>
            <div className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200">
              {sales.map((sale) => (
                <div
                  key={sale.id}
                  className="flex items-center justify-between gap-3 px-3 py-2.5 text-xs"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <Receipt className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-800">
                        #{sale.id} · {sale.cashier?.name ?? "Kasir"}
                      </p>
                      <p className="text-slate-500">
                        {formatDateTime(sale.createdAt)}
                      </p>
                    </div>
                  </div>
                  <p className="shrink-0 font-semibold text-slate-800">
                    {currency(sale.total)}
                  </p>
                </div>
              ))}
              {sales.length === 0 && (
                <p className="px-3 py-4 text-center text-xs text-slate-500">
                  Belum ada transaksi pada mesin ini.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
