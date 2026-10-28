"use client";

import { useEffect, useState } from "react";
import {
  FileText,
  Plus,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  Trash2,
  Scale,
} from "lucide-react";
import Swal from "sweetalert2";

interface JournalLine {
  id: string;
  debit: string | number;
  credit: string | number;
  description: string | null;
  account: {
    code: string;
    name: string;
    type: string;
  };
  location?: {
    name: string;
  } | null;
}

interface JournalEntry {
  id: string;
  entryNumber: string;
  transactionDate: string;
  sourceType: string;
  sourceId: string | null;
  description: string;
  status: string;
  lines: JournalLine[];
}

interface AccountOption {
  code: string;
  name: string;
  type: string;
}

export default function AccountingJournalsPage() {
  const [journals, setJournals] = useState<JournalEntry[]>([]);
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState("ALL");
  const [modalOpen, setModalOpen] = useState(false);

  // Manual Journal Form State
  const [description, setDescription] = useState("");
  const [transactionDate, setTransactionDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [lines, setLines] = useState<
    Array<{ accountCode: string; debit: number; credit: number; description: string }>
  >([
    { accountCode: "", debit: 0, credit: 0, description: "" },
    { accountCode: "", debit: 0, credit: 0, description: "" },
  ]);
  const [submitting, setSubmitting] = useState(false);

  const fetchJournals = async () => {
    try {
      setLoading(true);
      const url = new URL("/api/accounting/journals", window.location.origin);
      if (sourceFilter !== "ALL") url.searchParams.set("sourceType", sourceFilter);
      if (search) url.searchParams.set("search", search);

      const res = await fetch(url.toString());
      const data = await res.json();
      if (Array.isArray(data)) {
        setJournals(data);
      }
    } catch (err) {
      console.error("Gagal memuat jurnal:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAccounts = async () => {
    try {
      const res = await fetch("/api/accounting/accounts");
      const data = await res.json();
      if (Array.isArray(data)) {
        setAccounts(data.map((a: any) => ({ code: a.code, name: a.name, type: a.type })));
      }
    } catch (err) {
      console.error("Gagal memuat akun:", err);
    }
  };

  useEffect(() => {
    fetchJournals();
    fetchAccounts();
  }, [sourceFilter]);

  const addLine = () => {
    setLines([...lines, { accountCode: "", debit: 0, credit: 0, description: "" }]);
  };

  const removeLine = (index: number) => {
    if (lines.length <= 2) {
      Swal.fire("Info", "Minimal harus ada 2 baris jurnal (Debit & Kredit)", "info");
      return;
    }
    setLines(lines.filter((_, i) => i !== index));
  };

  const updateLine = (index: number, field: string, value: any) => {
    const updated = [...lines];
    updated[index] = { ...updated[index], [field]: value };
    setLines(updated);
  };

  const totalDebit = lines.reduce((sum, l) => sum + Number(l.debit || 0), 0);
  const totalCredit = lines.reduce((sum, l) => sum + Number(l.credit || 0), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01 && totalDebit > 0;

  const handleSubmitManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      Swal.fire("Peringatan", "Keterangan jurnal wajib diisi", "warning");
      return;
    }
    if (!isBalanced) {
      Swal.fire(
        "Jurnal Tidak Seimbang",
        `Total Debit (Rp ${totalDebit.toLocaleString("id-ID")}) harus sama persis dengan Total Kredit (Rp ${totalCredit.toLocaleString("id-ID")})`,
        "error"
      );
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/accounting/journals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description,
          transactionDate,
          lines: lines.filter((l) => l.accountCode && (l.debit > 0 || l.credit > 0)),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal membuat jurnal");

      await Swal.fire("Berhasil", "Jurnal manual berhasil diposting", "success");
      setModalOpen(false);
      setDescription("");
      setLines([
        { accountCode: "", debit: 0, credit: 0, description: "" },
        { accountCode: "", debit: 0, credit: 0, description: "" },
      ]);
      fetchJournals();
    } catch (err: any) {
      Swal.fire("Error", err.message || "Terjadi kesalahan", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const getSourceBadge = (sourceType: string) => {
    switch (sourceType) {
      case "SALE":
        return <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800">POS KASIR</span>;
      case "INVOICE":
        return <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-800">FAKTUR JUAL</span>;
      case "RECEIPT":
        return <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-bold text-purple-800">PENERIMAAN BARANG</span>;
      case "ADJUSTMENT":
        return <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">PENYESUAIAN STOK</span>;
      case "PAYMENT":
        return <span className="rounded-full bg-cyan-100 px-2 py-0.5 text-xs font-bold text-cyan-800">PEMBAYARAN</span>;
      default:
        return <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-800">MANUAL</span>;
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Jurnal Umum (General Journal)
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Daftar seluruh ayat jurnal pembukuan debit-kredit otomatis dan manual
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchJournals}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-700 shadow-xs hover:bg-slate-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Entri Jurnal Manual
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nomor jurnal atau keterangan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchJournals()}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-10 pr-4 text-sm text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-none"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {["ALL", "SALE", "INVOICE", "RECEIPT", "ADJUSTMENT", "PAYMENT", "MANUAL"].map((s) => (
            <button
              key={s}
              onClick={() => setSourceFilter(s)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                sourceFilter === s
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {s === "ALL" ? "Semua Sumber" : s}
            </button>
          ))}
        </div>
      </div>

      {/* Daftar Jurnal */}
      <div className="mt-6 space-y-4">
        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-slate-400">
            Memuat riwayat ayat jurnal...
          </div>
        ) : journals.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-slate-400">
            Belum ada ayat jurnal tercatat.
          </div>
        ) : (
          journals.map((entry) => (
            <div
              key={entry.id}
              className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xs"
            >
              <div className="flex flex-col gap-2 border-b border-slate-100 bg-slate-50/60 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm font-bold text-slate-900">
                    {entry.entryNumber}
                  </span>
                  {getSourceBadge(entry.sourceType)}
                  <span className="text-xs text-slate-400">
                    {new Date(entry.transactionDate).toLocaleDateString("id-ID", {
                      weekday: "short",
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>
                <div className="text-xs font-semibold text-slate-600">
                  {entry.description}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="border-b border-slate-100 bg-white text-[11px] font-semibold uppercase text-slate-400">
                    <tr>
                      <th className="px-5 py-2">Kode Akun</th>
                      <th className="px-5 py-2">Nama Akun & Uraian</th>
                      <th className="px-5 py-2 text-right">Debit</th>
                      <th className="px-5 py-2 text-right">Kredit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {entry.lines.map((line) => {
                      const debit = Number(line.debit || 0);
                      const credit = Number(line.credit || 0);
                      return (
                        <tr key={line.id} className="hover:bg-slate-50/50">
                          <td className="px-5 py-2.5 font-mono font-bold text-slate-800">
                            {line.account?.code}
                          </td>
                          <td className="px-5 py-2.5">
                            <span
                              className={
                                credit > 0
                                  ? "pl-6 font-medium text-slate-600"
                                  : "font-semibold text-slate-900"
                              }
                            >
                              {line.account?.name}
                            </span>
                            {line.description && (
                              <span className="ml-2 text-xs text-slate-400">
                                ({line.description})
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-2.5 text-right font-mono text-slate-900">
                            {debit > 0 ? `Rp ${debit.toLocaleString("id-ID")}` : "-"}
                          </td>
                          <td className="px-5 py-2.5 text-right font-mono text-slate-900">
                            {credit > 0 ? `Rp ${credit.toLocaleString("id-ID")}` : "-"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal Jurnal Manual */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900">Entri Jurnal Manual</h3>
            <p className="mt-1 text-xs text-slate-500">
              Buat penyesuaian akuntansi atau pencatatan pengeluaran operasional di luar transaksi kasir
            </p>

            <form onSubmit={handleSubmitManual} className="mt-4 space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Tanggal Transaksi</label>
                  <input
                    type="date"
                    value={transactionDate}
                    onChange={(e) => setTransactionDate(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-sm focus:border-blue-500 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Keterangan / Memo</label>
                  <input
                    type="text"
                    placeholder="Contoh: Pembayaran Biaya Listrik Toko"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-sm focus:border-blue-500 focus:outline-none"
                    required
                  />
                </div>
              </div>

              {/* Baris Debit / Kredit */}
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    Rincian Ayat Jurnal
                  </span>
                  <button
                    type="button"
                    onClick={addLine}
                    className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700"
                  >
                    <Plus className="h-3.5 w-3.5" /> Tambah Baris
                  </button>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 font-semibold text-slate-600">
                      <tr>
                        <th className="p-2.5">Akun</th>
                        <th className="p-2.5">Deskripsi</th>
                        <th className="p-2.5 text-right">Debit (Rp)</th>
                        <th className="p-2.5 text-right">Kredit (Rp)</th>
                        <th className="p-2.5 w-10 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {lines.map((line, idx) => (
                        <tr key={idx}>
                          <td className="p-2 min-w-[200px]">
                            <select
                              value={line.accountCode}
                              onChange={(e) => updateLine(idx, "accountCode", e.target.value)}
                              className="w-full rounded-lg border border-slate-200 p-1.5 text-xs focus:outline-none"
                              required
                            >
                              <option value="">-- Pilih Akun --</option>
                              {accounts.map((acc) => (
                                <option key={acc.code} value={acc.code}>
                                  {acc.code} - {acc.name}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="p-2">
                            <input
                              type="text"
                              placeholder="Keterangan baris"
                              value={line.description}
                              onChange={(e) => updateLine(idx, "description", e.target.value)}
                              className="w-full rounded-lg border border-slate-200 p-1.5 text-xs focus:outline-none"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={line.debit || ""}
                              onChange={(e) => {
                                updateLine(idx, "debit", Number(e.target.value));
                                if (Number(e.target.value) > 0) updateLine(idx, "credit", 0);
                              }}
                              className="w-full rounded-lg border border-slate-200 p-1.5 text-right text-xs font-mono focus:outline-none"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={line.credit || ""}
                              onChange={(e) => {
                                updateLine(idx, "credit", Number(e.target.value));
                                if (Number(e.target.value) > 0) updateLine(idx, "debit", 0);
                              }}
                              className="w-full rounded-lg border border-slate-200 p-1.5 text-right text-xs font-mono focus:outline-none"
                            />
                          </td>
                          <td className="p-2 text-center">
                            <button
                              type="button"
                              onClick={() => removeLine(idx)}
                              className="text-slate-400 hover:text-rose-600"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-50 font-mono font-bold text-slate-800">
                      <tr>
                        <td colSpan={2} className="p-2.5 text-right">
                          Total:
                        </td>
                        <td className="p-2.5 text-right">
                          Rp {totalDebit.toLocaleString("id-ID")}
                        </td>
                        <td className="p-2.5 text-right">
                          Rp {totalCredit.toLocaleString("id-ID")}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Status Keseimbangan */}
                <div
                  className={`flex items-center gap-2 rounded-xl p-3 text-xs font-semibold ${
                    isBalanced
                      ? "bg-emerald-50 text-emerald-800"
                      : "bg-rose-50 text-rose-700"
                  }`}
                >
                  <Scale className="h-4 w-4" />
                  {isBalanced ? (
                    <span>Jurnal seimbang (Debit = Kredit). Siap diposting.</span>
                  ) : (
                    <span>
                      Jurnal belum seimbang! Selisih: Rp{" "}
                      {Math.abs(totalDebit - totalCredit).toLocaleString("id-ID")}
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting || !isBalanced}
                  className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-blue-700 disabled:opacity-50"
                >
                  {submitting ? "Memposting..." : "Posting Jurnal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

