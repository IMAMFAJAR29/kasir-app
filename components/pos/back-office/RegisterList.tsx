"use client";

import {
  Clock,
  Loader2,
  MonitorSmartphone,
  Package,
  UserRound,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export interface RegisterActiveSession {
  id: string;
  openedAt: string;
  openingCash: number;
  cashier: { id: string; name: string; email: string | null };
}

export interface RegisterSummary {
  id: number;
  name: string;
  code: string;
  isActive: boolean;
  location: { id: number; name: string };
  warehouse: { id: number; name: string };
  activeSession: RegisterActiveSession | null;
}

interface RegisterListProps {
  registers: RegisterSummary[];
  selectedId: number | null;
  loading: boolean;
  currentUserId?: string;
  onSelect: (register: RegisterSummary) => void;
}

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  });

/**
 * Langkah 2 Cashier Back Office: memilih mesin kasir.
 * Status mesin diturunkan dari shift yang masih terbuka di server, bukan
 * dari state lokal perangkat.
 */
export default function RegisterList({
  registers,
  selectedId,
  loading,
  currentUserId,
  onSelect,
}: RegisterListProps) {
  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
            <MonitorSmartphone className="h-4 w-4 text-blue-600" />
            2. Pilih mesin kasir
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Setiap mesin memakai satu gudang stok. Pastikan gudangnya sesuai.
          </p>
        </div>
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
        ) : (
          <Badge variant="info">{registers.length} mesin</Badge>
        )}
      </div>

      <div className="mt-4 space-y-3">
        {registers.map((register) => {
          const isSelected = selectedId === register.id;
          const session = register.activeSession;
          const isMine = session?.cashier.id === currentUserId;
          const isBusy = Boolean(session) && !isMine;

          return (
            <button
              key={register.id}
              type="button"
              disabled={!register.isActive || isBusy}
              onClick={() => onSelect(register)}
              className={`w-full rounded-xl border p-4 text-left transition ${
                isSelected
                  ? "border-blue-500 bg-blue-50/70 ring-1 ring-blue-500/30"
                  : "border-slate-200 bg-white hover:border-blue-200 hover:bg-slate-50"
              } ${
                !register.isActive || isBusy
                  ? "cursor-not-allowed opacity-70"
                  : ""
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {register.name}
                    </p>
                    <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] font-medium text-slate-500">
                      {register.code}
                    </span>
                    {!register.isActive && (
                      <Badge variant="danger">Nonaktif</Badge>
                    )}
                  </div>
                  <p className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-600">
                    <Package className="h-3.5 w-3.5 text-slate-400" />
                    {register.warehouse.name}
                  </p>
                </div>

                {session ? (
                  <Badge variant={isMine ? "success" : "warning"} withDot>
                    {isMine ? "Shift Anda" : "Dipakai"}
                  </Badge>
                ) : (
                  <Badge variant="success" withDot>
                    Tersedia
                  </Badge>
                )}
              </div>

              {session && (
                <div className="mt-3 flex items-center gap-2 rounded-lg bg-white/70 px-2.5 py-2 text-xs text-slate-600">
                  <UserRound className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                  <span className="truncate font-medium text-slate-700">
                    {session.cashier.name}
                  </span>
                  <Clock className="ml-auto h-3.5 w-3.5 shrink-0 text-slate-400" />
                  <span className="shrink-0">
                    {formatDateTime(session.openedAt)}
                  </span>
                </div>
              )}
            </button>
          );
        })}

        {!loading && registers.length === 0 && (
          <p className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
            Outlet ini belum memiliki mesin kasir. Hubungi administrator untuk
            menambahkannya.
          </p>
        )}
        {loading && registers.length === 0 && (
          <div className="space-y-2">
            {[0, 1].map((row) => (
              <div
                key={row}
                className="h-20 animate-pulse rounded-xl bg-slate-100"
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
