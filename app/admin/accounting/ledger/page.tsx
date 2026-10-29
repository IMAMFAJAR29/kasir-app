"use client";

import { useEffect, useState } from "react";
import { BookOpen, Calendar, RefreshCw, ArrowUpRight, ArrowDownLeft } from "lucide-react";

interface AccountOption {
  code: string;
  name: string;
}

interface LedgerLine {
  id: string;
  date: string;
  entryNumber: string;
  sourceType: string;
  description: string;
  locationName: string;
  debit: number;
  credit: number;
  runningBalance: number;
}

interface LedgerData {
  account: {
    code: string;
    name: string;
    type: string;
    normalBalance: string;
  };
  openingBalance: number;
  periodDebit: number;
  periodCredit: number;
  closingBalance: number;
  lines: LedgerLine[];
}

export default function AccountingLedgerPage() {
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [selectedCode, setSelectedCode] = useState<string>("1-1001");
  const [startDate, setStartDate] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString()
      .slice(0, 10)
  );
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [ledger, setLedger] = useState<LedgerData | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchAccounts = async () => {
    try {
      const res = await fetch("/api/accounting/accounts");
      const data = await res.json();
      if (Array.isArray(data)) {
        setAccounts(data.map((a: any) => ({ code: a.code, name: a.name })));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchLedger = async () => {
    if (!selectedCode) return;
    try {
      setLoading(true);
      const url = new URL("/api/accounting/reports/ledger", window.location.origin);
      url.searchParams.set("accountCode", selectedCode);
      if (startDate) url.searchParams.set("startDate", startDate);
      if (endDate) url.searchParams.set("endDate", endDate);

      const res = await fetch(url.toString());
      const data = await res.json();
      if (res.ok) {
        setLedger(data);
      }
    } catch (err) {
      console.error("Gagal memuat buku besar:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  useEffect(() => {
    fetchLedger();
  }, [selectedCode, startDate, endDate]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Buku Besar (General Ledger)
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Rincian mutasi debit, kredit, dan saldo berjalan historis per rekening akuntansi
          </p>
        </div>
        <button
          onClick={fetchLedger}
          className="inline-flex items-center gap-1.5 self-start rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-700 shadow-xs hover:bg-slate-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Filter Kontrol */}
      <div className="mt-6 grid grid-cols-1 gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs sm:grid-cols-3">
        <div>
          <label className="block text-xs font-semibold uppercase text-slate-500">Pilih Akun</label>
          <select
            value={selectedCode}
            onChange={(e) => setSelectedCode(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-sm font-semibold text-slate-900 focus:bg-white focus:outline-none"
          >
            {accounts.map((acc) => (
              <option key={acc.code} value={acc.code}>
                {acc.code} - {acc.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase text-slate-500">Dari Tanggal</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 p-2 text-sm text-slate-900 focus:bg-white focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase text-slate-500">Sampai Tanggal</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 p-2 text-sm text-slate-900 focus:bg-white focus:outline-none"
          />
        </div>
      </div>

      {/* Kartu Ringkasan Saldo */}
      {ledger && (
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
            <span className="text-xs font-medium text-slate-500">Saldo Awal</span>
            <div className="mt-1 text-lg font-bold font-mono text-slate-900">
              Rp {ledger.openingBalance.toLocaleString("id-ID")}
            </div>
            <span className="text-xs text-slate-400">Sebelum {startDate}</span>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
            <span className="text-xs font-medium text-emerald-600">Total Mutasi Debit</span>
            <div className="mt-1 text-lg font-bold font-mono text-emerald-700">
              Rp {ledger.periodDebit.toLocaleString("id-ID")}
            </div>
            <span className="text-xs text-slate-400">Penambahan / Arus Debit</span>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
            <span className="text-xs font-medium text-rose-600">Total Mutasi Kredit</span>
            <div className="mt-1 text-lg font-bold font-mono text-rose-700">
              Rp {ledger.periodCredit.toLocaleString("id-ID")}
            </div>
            <span className="text-xs text-slate-400">Pengurangan / Arus Kredit</span>
          </div>
          <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-4 shadow-xs">
            <span className="text-xs font-bold text-blue-700">Saldo Akhir</span>
            <div className="mt-1 text-lg font-bold font-mono text-blue-900">
              Rp {ledger.closingBalance.toLocaleString("id-ID")}
            </div>
            <span className="text-xs font-semibold text-blue-600">
              Saldo Normal: {ledger.account.normalBalance}
            </span>
          </div>
        </div>
      )}

      {/* Tabel Rincian Buku Besar */}
      <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-600">
              <tr>
                <th className="px-4 py-3.5">Tanggal</th>
                <th className="px-4 py-3.5">No. Jurnal</th>
                <th className="px-4 py-3.5">Keterangan</th>
                <th className="px-4 py-3.5 text-right">Debit</th>
                <th className="px-4 py-3.5 text-right">Kredit</th>
                <th className="px-4 py-3.5 text-right">Saldo Berjalan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                    Memuat rincian buku besar...
                  </td>
                </tr>
              ) : !ledger || ledger.lines.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                    Tidak ada transaksi pada periode yang dipilih.
                  </td>
                </tr>
              ) : (
                ledger.lines.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/80 transition">
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {new Date(row.date).toLocaleDateString("id-ID", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs font-bold text-blue-600">
                      {row.entryNumber}
                    </td>
                    <td className="px-4 py-3 text-slate-900">
                      {row.description}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-slate-900">
                      {row.debit > 0 ? `Rp ${row.debit.toLocaleString("id-ID")}` : "-"}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-slate-900">
                      {row.credit > 0 ? `Rp ${row.credit.toLocaleString("id-ID")}` : "-"}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">
                      Rp {row.runningBalance.toLocaleString("id-ID")}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

