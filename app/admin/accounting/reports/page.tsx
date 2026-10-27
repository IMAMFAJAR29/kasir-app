"use client";

import { useEffect, useState } from "react";
import {
  TrendingUp,
  FileSpreadsheet,
  Scale,
  Calendar,
  RefreshCw,
  Printer,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

export default function AccountingReportsPage() {
  const [activeTab, setActiveTab] = useState<"income" | "balance" | "trial">("income");
  const [startDate, setStartDate] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString()
      .slice(0, 10)
  );
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));

  // Data states
  const [incomeData, setIncomeData] = useState<any>(null);
  const [balanceData, setBalanceData] = useState<any>(null);
  const [trialData, setTrialData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === "income") {
        const res = await fetch(
          `/api/accounting/reports/income-statement?startDate=${startDate}&endDate=${endDate}`
        );
        const data = await res.json();
        setIncomeData(data);
      } else if (activeTab === "balance") {
        const res = await fetch(
          `/api/accounting/reports/balance-sheet?asOfDate=${endDate}`
        );
        const data = await res.json();
        setBalanceData(data);
      } else if (activeTab === "trial") {
        const res = await fetch(
          `/api/accounting/reports/trial-balance?asOfDate=${endDate}`
        );
        const data = await res.json();
        setTrialData(data);
      }
    } catch (err) {
      console.error("Gagal memuat laporan:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab, startDate, endDate]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Laporan Keuangan (Financial Statements)
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Laporan Laba Rugi, Neraca Keuangan, dan Neraca Saldo terintegrasi real-time
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-700 shadow-xs hover:bg-slate-50"
          >
            <Printer className="h-4 w-4" />
            Cetak Laporan
          </button>
          <button
            onClick={fetchData}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-700 shadow-xs hover:bg-slate-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Tab Navigasi */}
      <div className="mt-6 flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab("income")}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-bold transition ${
            activeTab === "income"
              ? "border-blue-600 text-blue-700"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <TrendingUp className="h-4 w-4" />
          Laba Rugi (Income Statement)
        </button>
        <button
          onClick={() => setActiveTab("balance")}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-bold transition ${
            activeTab === "balance"
              ? "border-blue-600 text-blue-700"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <FileSpreadsheet className="h-4 w-4" />
          Neraca Keuangan (Balance Sheet)
        </button>
        <button
          onClick={() => setActiveTab("trial")}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-bold transition ${
            activeTab === "trial"
              ? "border-blue-600 text-blue-700"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Scale className="h-4 w-4" />
          Neraca Saldo (Trial Balance)
        </button>
      </div>

      {/* Filter Tanggal */}
      <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-3 shadow-xs">
        {activeTab === "income" && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Dari:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="rounded-lg border border-slate-200 p-1.5 text-xs text-slate-900 focus:outline-none"
            />
          </div>
        )}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500">
            {activeTab === "income" ? "Sampai:" : "Per Tanggal:"}
          </span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="rounded-lg border border-slate-200 p-1.5 text-xs text-slate-900 focus:outline-none"
          />
        </div>
      </div>

      {/* Konten Laporan */}
      <div className="mt-6">
        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-slate-400">
            Menghitung kalkulasi laporan keuangan...
          </div>
        ) : activeTab === "income" && incomeData ? (
          /* TAB 1: LABA RUGI */
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8">
            <div className="border-b border-slate-200 pb-4 text-center">
              <h2 className="text-xl font-bold text-slate-900">LAPORAN LABA RUGI</h2>
              <p className="mt-1 text-xs text-slate-500">
                Periode: {new Date(startDate).toLocaleDateString("id-ID")} s/d{" "}
                {new Date(endDate).toLocaleDateString("id-ID")}
              </p>
            </div>

            <div className="mt-6 space-y-6">
              {/* Pendapatan */}
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                  1. Pendapatan Usaha
                </h3>
                <div className="mt-2 divide-y divide-slate-100 border-t border-slate-200">
                  {incomeData.revenues.map((r: any) => (
                    <div key={r.code} className="flex justify-between py-2 text-sm">
                      <span className="text-slate-600">
                        {r.code} - {r.name}
                      </span>
                      <span className="font-mono font-semibold text-slate-900">
                        Rp {r.amount.toLocaleString("id-ID")}
                      </span>
                    </div>
                  ))}
                  <div className="flex justify-between py-2.5 font-bold text-slate-900">
                    <span>Total Pendapatan</span>
                    <span className="font-mono text-emerald-700">
                      Rp {incomeData.totalRevenue.toLocaleString("id-ID")}
                    </span>
                  </div>
                </div>
              </div>

              {/* Beban Pokok Penjualan (HPP) */}
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                  2. Beban Pokok Penjualan (HPP)
                </h3>
                <div className="mt-2 divide-y divide-slate-100 border-t border-slate-200">
                  {incomeData.cogs.map((c: any) => (
                    <div key={c.code} className="flex justify-between py-2 text-sm">
                      <span className="text-slate-600">
                        {c.code} - {c.name}
                      </span>
                      <span className="font-mono font-semibold text-slate-900">
                        Rp {c.amount.toLocaleString("id-ID")}
                      </span>
                    </div>
                  ))}
                  <div className="flex justify-between py-2.5 font-bold text-slate-900">
                    <span>Total Beban Pokok Penjualan</span>
                    <span className="font-mono text-rose-700">
                      (Rp {incomeData.totalCogs.toLocaleString("id-ID")})
                    </span>
                  </div>
                </div>
              </div>

              {/* Laba Kotor */}
              <div className="flex justify-between rounded-xl bg-slate-50 p-3.5 font-bold text-slate-900">
                <span className="text-base">LABA KOTOR (GROSS PROFIT)</span>
                <span className="font-mono text-base text-blue-700">
                  Rp {incomeData.grossProfit.toLocaleString("id-ID")}
                </span>
              </div>

              {/* Beban Operasional */}
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                  3. Beban Operasional
                </h3>
                <div className="mt-2 divide-y divide-slate-100 border-t border-slate-200">
                  {incomeData.operatingExpenses.map((e: any) => (
                    <div key={e.code} className="flex justify-between py-2 text-sm">
                      <span className="text-slate-600">
                        {e.code} - {e.name}
                      </span>
                      <span className="font-mono font-semibold text-slate-900">
                        Rp {e.amount.toLocaleString("id-ID")}
                      </span>
                    </div>
                  ))}
                  <div className="flex justify-between py-2.5 font-bold text-slate-900">
                    <span>Total Beban Operasional</span>
                    <span className="font-mono text-rose-700">
                      (Rp {incomeData.totalOperatingExpense.toLocaleString("id-ID")})
                    </span>
                  </div>
                </div>
              </div>

              {/* Laba Bersih */}
              <div
                className={`flex justify-between rounded-2xl p-4 font-bold ${
                  incomeData.netIncome >= 0
                    ? "bg-emerald-50 text-emerald-900 border border-emerald-200"
                    : "bg-rose-50 text-rose-900 border border-rose-200"
                }`}
              >
                <span className="text-lg">LABA BERSIH BERJALAN (NET INCOME)</span>
                <span className="font-mono text-xl">
                  Rp {incomeData.netIncome.toLocaleString("id-ID")}
                </span>
              </div>
            </div>
          </div>
        ) : activeTab === "balance" && balanceData ? (
          /* TAB 2: NERACA KEUANGAN */
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8">
            <div className="border-b border-slate-200 pb-4 text-center">
              <h2 className="text-xl font-bold text-slate-900">NERACA KEUANGAN (BALANCE SHEET)</h2>
              <p className="mt-1 text-xs text-slate-500">
                Posisi Keuangan per {new Date(endDate).toLocaleDateString("id-ID")}
              </p>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-8 md:grid-cols-2">
              {/* Kolom Kiri: ASET */}
              <div>
                <h3 className="border-b border-slate-900 pb-2 text-base font-bold text-slate-900">
                  ASET (AKTIVA)
                </h3>
                <div className="mt-3 divide-y divide-slate-100">
                  {balanceData.assets.map((a: any) => (
                    <div key={a.code} className="flex justify-between py-2 text-sm">
                      <span className="text-slate-600">
                        {a.code} - {a.name}
                      </span>
                      <span className="font-mono font-semibold text-slate-900">
                        Rp {a.amount.toLocaleString("id-ID")}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex justify-between rounded-xl bg-blue-50 p-3 font-bold text-blue-900">
                  <span>TOTAL ASET</span>
                  <span className="font-mono">
                    Rp {balanceData.totalAssets.toLocaleString("id-ID")}
                  </span>
                </div>
              </div>

              {/* Kolom Kanan: LIABILITAS & EKUITAS */}
              <div className="space-y-6">
                <div>
                  <h3 className="border-b border-slate-900 pb-2 text-base font-bold text-slate-900">
                    LIABILITAS (KEWAJIBAN)
                  </h3>
                  <div className="mt-3 divide-y divide-slate-100">
                    {balanceData.liabilities.map((l: any) => (
                      <div key={l.code} className="flex justify-between py-2 text-sm">
                        <span className="text-slate-600">
                          {l.code} - {l.name}
                        </span>
                        <span className="font-mono font-semibold text-slate-900">
                          Rp {l.amount.toLocaleString("id-ID")}
                        </span>
                      </div>
                    ))}
                    <div className="flex justify-between py-2 font-bold text-slate-800">
                      <span>Total Liabilitas</span>
                      <span className="font-mono">
                        Rp {balanceData.totalLiabilities.toLocaleString("id-ID")}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="border-b border-slate-900 pb-2 text-base font-bold text-slate-900">
                    EKUITAS (MODAL)
                  </h3>
                  <div className="mt-3 divide-y divide-slate-100">
                    {balanceData.equity.map((e: any) => (
                      <div key={e.code} className="flex justify-between py-2 text-sm">
                        <span className="text-slate-600">
                          {e.code} - {e.name}
                        </span>
                        <span className="font-mono font-semibold text-slate-900">
                          Rp {e.amount.toLocaleString("id-ID")}
                        </span>
                      </div>
                    ))}
                    <div className="flex justify-between py-2 font-bold text-slate-800">
                      <span>Total Ekuitas</span>
                      <span className="font-mono">
                        Rp {balanceData.totalEquity.toLocaleString("id-ID")}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between rounded-xl bg-purple-50 p-3 font-bold text-purple-900">
                  <span>TOTAL LIABILITAS & EKUITAS</span>
                  <span className="font-mono">
                    Rp {balanceData.totalLiabilitiesAndEquity.toLocaleString("id-ID")}
                  </span>
                </div>
              </div>
            </div>

            {/* Banner Keseimbangan Neraca */}
            <div
              className={`mt-8 flex items-center justify-between rounded-2xl p-4 text-sm font-bold ${
                balanceData.isBalanced
                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                  : "bg-rose-50 text-rose-800 border border-rose-200"
              }`}
            >
              <div className="flex items-center gap-2">
                {balanceData.isBalanced ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : (
                  <AlertTriangle className="h-5 w-5" />
                )}
                <span>
                  {balanceData.isBalanced
                    ? "Neraca Seimbang: Aset = Liabilitas + Ekuitas."
                    : `Neraca Tidak Seimbang! Selisih: Rp ${balanceData.difference.toLocaleString("id-ID")}`}
                </span>
              </div>
            </div>
          </div>
        ) : activeTab === "trial" && trialData ? (
          /* TAB 3: NERACA SALDO */
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8">
            <div className="border-b border-slate-200 pb-4 text-center">
              <h2 className="text-xl font-bold text-slate-900">NERACA SALDO (TRIAL BALANCE)</h2>
              <p className="mt-1 text-xs text-slate-500">
                Posisi Saldo per {new Date(endDate).toLocaleDateString("id-ID")}
              </p>
            </div>

            <div className="mt-6 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-600">
                  <tr>
                    <th className="px-4 py-3">Kode</th>
                    <th className="px-4 py-3">Nama Akun</th>
                    <th className="px-4 py-3">Tipe</th>
                    <th className="px-4 py-3 text-right">Debit (Rp)</th>
                    <th className="px-4 py-3 text-right">Kredit (Rp)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {trialData.rows.map((row: any) => (
                    <tr key={row.code} className="hover:bg-slate-50">
                      <td className="px-4 py-2.5 font-mono font-bold text-slate-900">
                        {row.code}
                      </td>
                      <td className="px-4 py-2.5 font-semibold text-slate-900">
                        {row.name}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-slate-500">
                        {row.type}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-slate-900">
                        {row.debit > 0 ? row.debit.toLocaleString("id-ID") : "-"}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-slate-900">
                        {row.credit > 0 ? row.credit.toLocaleString("id-ID") : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t-2 border-slate-300 bg-slate-50 font-mono font-bold text-slate-900">
                  <tr>
                    <td colSpan={3} className="px-4 py-3 text-right">
                      TOTAL NERACA SALDO:
                    </td>
                    <td className="px-4 py-3 text-right text-emerald-700">
                      Rp {trialData.totalDebit.toLocaleString("id-ID")}
                    </td>
                    <td className="px-4 py-3 text-right text-emerald-700">
                      Rp {trialData.totalCredit.toLocaleString("id-ID")}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div
              className={`mt-6 flex items-center justify-between rounded-xl p-3 text-xs font-bold ${
                trialData.isBalanced
                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                  : "bg-rose-50 text-rose-800 border border-rose-200"
              }`}
            >
              <span>
                {trialData.isBalanced
                  ? "Neraca Saldo Seimbang (Total Debit = Total Kredit)."
                  : `Neraca Saldo Tidak Seimbang! Selisih: Rp ${trialData.difference.toLocaleString("id-ID")}`}
              </span>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

