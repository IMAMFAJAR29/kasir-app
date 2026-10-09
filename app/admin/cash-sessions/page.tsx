"use client";

import { useCallback, useEffect, useState } from "react";
import BrandLoader from "@/components/BrandLoader";

interface CashSessionRow {
  id: string;
  cashier: { name: string; email: string };
  openingCash: number;
  expectedCash: number;
  closingCash: number | null;
  difference: number | null;
  openedAt: string;
  closedAt: string | null;
  notes: string | null;
}

const currency = (value: number) =>
  `Rp ${value.toLocaleString("id-ID")}`;

export default function CashSessionsPage() {
  const [sessions, setSessions] = useState<CashSessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadSessions = useCallback(async () => {
    setError("");
    try {
      const response = await fetch("/api/cash-sessions");
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Gagal memuat setoran.");
      setSessions(body);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Gagal memuat setoran kas."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  if (loading) return <BrandLoader label="Memuat rekonsiliasi kas..." />;

  return (
    <div className="mx-auto max-w-6xl space-y-5 px-4 py-6 sm:px-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-brand-navy">
          Setoran & Rekonsiliasi Kas
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Bandingkan kas yang seharusnya tersedia dengan uang fisik per shift.
        </p>
      </div>

      {error && (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {error}
          <button onClick={() => void loadSessions()} className="ml-3 font-semibold underline">
            Coba lagi
          </button>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[780px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Kasir / Shift</th>
                <th className="px-4 py-3 text-right">Modal Awal</th>
                <th className="px-4 py-3 text-right">Kas Diharapkan</th>
                <th className="px-4 py-3">Uang Fisik / Selisih</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sessions.map((cashSession) => (
                <tr key={cashSession.id} className="hover:bg-blue-50/40">
                  <td className="px-4 py-4">
                    <p className="font-semibold text-slate-900">{cashSession.cashier.name}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{cashSession.cashier.email}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      Buka {new Date(cashSession.openedAt).toLocaleString("id-ID")}
                    </p>
                  </td>
                  <td className="px-4 py-4 text-right font-medium text-slate-700">
                    {currency(cashSession.openingCash)}
                  </td>
                  <td className="px-4 py-4 text-right font-semibold text-brand-navy">
                    {currency(cashSession.expectedCash)}
                  </td>
                  <td className="px-4 py-4">
                    {cashSession.closedAt ? (
                      <>
                        <p className="font-semibold text-slate-800">
                          {currency(cashSession.closingCash ?? 0)}
                        </p>
                        <p
                          className={`mt-0.5 text-xs font-semibold ${
                            cashSession.difference === 0
                              ? "text-teal-700"
                              : "text-rose-700"
                          }`}
                        >
                          Selisih{" "}
                          {cashSession.difference !== null &&
                          cashSession.difference < 0
                            ? "−"
                            : "+"}
                          {currency(Math.abs(cashSession.difference ?? 0))}
                        </p>
                      </>
                    ) : (
                      <span className="text-xs text-slate-500">
                        Kasir menutup shift dari POS setelah sinkronisasi.
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        cashSession.closedAt
                          ? "bg-slate-100 text-slate-600"
                          : "bg-teal-50 text-teal-700"
                      }`}
                    >
                      {cashSession.closedAt ? "Ditutup" : "Shift aktif"}
                    </span>
                  </td>
                </tr>
              ))}
              {sessions.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-sm text-slate-500">
                    Belum ada shift kasir hari ini.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
