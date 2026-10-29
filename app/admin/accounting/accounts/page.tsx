"use client";

import { useEffect, useState } from "react";
import {
  BookOpen,
  Plus,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import Swal from "sweetalert2";

interface AccountItem {
  id: string;
  code: string;
  name: string;
  type: "ASSET" | "LIABILITY" | "EQUITY" | "REVENUE" | "EXPENSE";
  normalBalance: "DEBIT" | "CREDIT";
  category: string | null;
  description: string | null;
  isSystem: boolean;
  isActive: boolean;
  totalDebit: number;
  totalCredit: number;
  balance: number;
}

export default function AccountingAccountsPage() {
  const [accounts, setAccounts] = useState<AccountItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<string>("ALL");
  const [modalOpen, setModalOpen] = useState(false);

  // Form state
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [type, setType] = useState<"ASSET" | "LIABILITY" | "EQUITY" | "REVENUE" | "EXPENSE">("EXPENSE");
  const [normalBalance, setNormalBalance] = useState<"DEBIT" | "CREDIT">("DEBIT");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/accounting/accounts");
      const data = await res.json();
      if (Array.isArray(data)) {
        setAccounts(data);
      }
    } catch (err) {
      console.error("Gagal memuat akun:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const handleTypeChange = (selectedType: "ASSET" | "LIABILITY" | "EQUITY" | "REVENUE" | "EXPENSE") => {
    setType(selectedType);
    if (selectedType === "ASSET" || selectedType === "EXPENSE") {
      setNormalBalance("DEBIT");
    } else {
      setNormalBalance("CREDIT");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || !name) {
      Swal.fire("Peringatan", "Kode dan nama akun wajib diisi", "warning");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/accounting/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          name,
          type,
          normalBalance,
          description,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal membuat akun");
      }

      await Swal.fire("Berhasil", "Akun berhasil ditambahkan ke Chart of Accounts", "success");
      setModalOpen(false);
      setCode("");
      setName("");
      setDescription("");
      fetchAccounts();
    } catch (err: any) {
      Swal.fire("Error", err.message || "Terjadi kesalahan", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredAccounts = accounts.filter((acc) => {
    const matchesSearch =
      acc.code.toLowerCase().includes(search.toLowerCase()) ||
      acc.name.toLowerCase().includes(search.toLowerCase());
    const matchesType = filterType === "ALL" || acc.type === filterType;
    return matchesSearch && matchesType;
  });

  const getTypeBadge = (accType: string) => {
    switch (accType) {
      case "ASSET":
        return <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-700">ASET</span>;
      case "LIABILITY":
        return <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700">LIABILITAS</span>;
      case "EQUITY":
        return <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-semibold text-purple-700">EKUITAS</span>;
      case "REVENUE":
        return <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">PENDAPATAN</span>;
      case "EXPENSE":
        return <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-semibold text-rose-700">BEBAN</span>;
      default:
        return <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">{accType}</span>;
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Bagan Akun (Chart of Accounts)
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Daftar seluruh rekening akuntansi double-entry yang terhubung ke transaksi operasional
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchAccounts}
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
            Tambah Akun
          </button>
        </div>
      </div>

      {/* Filter & Pencarian */}
      <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari kode atau nama akun..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-10 pr-4 text-sm text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-none"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {["ALL", "ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"].map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                filterType === t
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {t === "ALL" ? "Semua Tipe" : t}
            </button>
          ))}
        </div>
      </div>

      {/* Tabel Akun */}
      <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-600">
              <tr>
                <th className="px-4 py-3.5">Kode Akun</th>
                <th className="px-4 py-3.5">Nama Akun</th>
                <th className="px-4 py-3.5">Klasifikasi</th>
                <th className="px-4 py-3.5 text-center">Saldo Normal</th>
                <th className="px-4 py-3.5 text-right">Total Debit</th>
                <th className="px-4 py-3.5 text-right">Total Kredit</th>
                <th className="px-4 py-3.5 text-right">Saldo Saat Ini</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                    Memuat data Chart of Accounts...
                  </td>
                </tr>
              ) : filteredAccounts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                    Tidak ada akun yang sesuai dengan filter
                  </td>
                </tr>
              ) : (
                filteredAccounts.map((acc) => (
                  <tr key={acc.id} className="hover:bg-slate-50/80 transition">
                    <td className="px-4 py-3 font-mono font-bold text-slate-900">
                      {acc.code}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900">{acc.name}</span>
                        {acc.isSystem && (
                          <span
                            title="Akun bawaan sistem untuk posting otomatis"
                            className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-bold text-slate-500"
                          >
                            SYSTEM
                          </span>
                        )}
                      </div>
                      {acc.description && (
                        <div className="text-xs text-slate-400">{acc.description}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">{getTypeBadge(acc.type)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-xs font-bold text-slate-600">
                        {acc.normalBalance}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-slate-600">
                      Rp {acc.totalDebit.toLocaleString("id-ID")}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-slate-600">
                      Rp {acc.totalCredit.toLocaleString("id-ID")}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">
                      Rp {acc.balance.toLocaleString("id-ID")}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Tambah Akun */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900">Tambah Akun Baru</h3>
            <p className="mt-1 text-xs text-slate-500">
              Tambahkan rekening baru ke dalam bagan akun usaha Anda
            </p>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700">Kode Akun</label>
                <input
                  type="text"
                  placeholder="Contoh: 6-1020"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-sm font-mono focus:border-blue-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Nama Akun</label>
                <input
                  type="text"
                  placeholder="Contoh: Beban Listrik & Internet"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-sm focus:border-blue-500 focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Klasifikasi</label>
                  <select
                    value={type}
                    onChange={(e) => handleTypeChange(e.target.value as any)}
                    className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-sm focus:border-blue-500 focus:outline-none"
                  >
                    <option value="ASSET">Aset (Harta)</option>
                    <option value="LIABILITY">Liabilitas (Kewajiban)</option>
                    <option value="EQUITY">Ekuitas (Modal)</option>
                    <option value="REVENUE">Pendapatan</option>
                    <option value="EXPENSE">Beban (Pengeluaran)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Saldo Normal</label>
                  <select
                    value={normalBalance}
                    onChange={(e) => setNormalBalance(e.target.value as any)}
                    className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-sm focus:border-blue-500 focus:outline-none"
                  >
                    <option value="DEBIT">DEBIT</option>
                    <option value="CREDIT">CREDIT</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Keterangan (Opsional)</label>
                <textarea
                  placeholder="Deskripsi fungsi penggunaan akun ini"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-sm focus:border-blue-500 focus:outline-none"
                />
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
                  disabled={submitting}
                  className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-blue-700 disabled:opacity-50"
                >
                  {submitting ? "Menyimpan..." : "Simpan Akun"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

