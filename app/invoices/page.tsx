"use client";

import { useState, useEffect } from "react";
import { Printer, Plus, Trash, Edit } from "lucide-react";
import Swal from "sweetalert2";
import InvoiceModal from "@/components/invoices/InvoiceModal";
import Button from "@/components/Button";

interface Invoice {
  id: number;
  invoiceNumber: string;
  createdAt: string;
  totalAmount: number;
  status: string;
  customerName?: string;
  locationName?: string;
}

export default function InvoicePage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);

  // Ambil semua faktur
  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/invoices");
      if (!res.ok) throw new Error("Gagal memuat data faktur");
      const data = await res.json();
      setInvoices(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  // Edit faktur → fetch detail dari backend
  const handleEdit = async (inv: Invoice) => {
    Swal.fire({
      title: "Memuat Faktur...",
      text: "Mohon tunggu sebentar",
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    });

    try {
      const res = await fetch(`/api/invoices/${inv.id}`);
      if (!res.ok) throw new Error("Gagal memuat data faktur");
      const data = await res.json();
      Swal.close();
      setEditingInvoice(data);
      setShowModal(true);
    } catch (err) {
      console.error(err);
      Swal.fire("Error", "Gagal memuat detail faktur", "error");
    }
  };

  // Cetak faktur
  const handlePrint = (inv: Invoice) => {
    window.open(`/invoices/print/${inv.id}`, "_blank");
  };

  // Toggle status paid/unpaid
  const handleToggleStatus = async (inv: Invoice) => {
    const newStatus = inv.status === "paid" ? "unpaid" : "paid";
    try {
      const res = await fetch(`/api/invoices/${inv.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Gagal ubah status");

      setInvoices((prev) =>
        prev.map((i) => (i.id === inv.id ? { ...i, status: newStatus } : i))
      );
    } catch (err) {
      Swal.fire("Error", "Gagal ubah status faktur", "error");
    }
  };

  // Hapus faktur
  const handleDelete = async (inv: Invoice) => {
    if (inv.status === "paid") return; // tidak bisa hapus yang sudah lunas
    const confirm = await Swal.fire({
      title: "Hapus Faktur?",
      text: `Apakah kamu yakin ingin menghapus ${inv.invoiceNumber}?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Ya, hapus",
    });
    if (!confirm.isConfirmed) return;

    try {
      const res = await fetch(`/api/invoices/${inv.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Gagal hapus faktur");
      setInvoices((prev) => prev.filter((i) => i.id !== inv.id));
      Swal.fire("Terhapus!", "Faktur berhasil dihapus", "success");
    } catch (err) {
      Swal.fire("Error", "Gagal menghapus faktur", "error");
    }
  };

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "paid" | "unpaid">("all");

  // Metrics calculation
  const totalAmount = invoices.reduce((sum, inv) => sum + Number(inv.totalAmount || 0), 0);
  const paidInvoices = invoices.filter((i) => i.status === "paid");
  const unpaidInvoices = invoices.filter((i) => i.status !== "paid");
  const paidAmount = paidInvoices.reduce((sum, inv) => sum + Number(inv.totalAmount || 0), 0);
  const unpaidAmount = unpaidInvoices.reduce((sum, inv) => sum + Number(inv.totalAmount || 0), 0);

  // Filtered invoices
  const filteredInvoices = invoices.filter((inv) => {
    const matchesSearch =
      inv.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
      (inv.customerName && inv.customerName.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus =
      statusFilter === "all" || inv.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Transaksi Faktur Penjualan
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Daftar penagihan, riwayat invoice penjualan, dan kontrol status pelunasan
          </p>
        </div>

        <Button
          onClick={() => {
            setEditingInvoice(null);
            setShowModal(true);
          }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
        >
          <Plus size={16} />
          <span>Tambah Faktur Baru</span>
        </Button>
      </div>

      {/* Metrics Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-xs">
          <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">
            Total Nilai Faktur
          </span>
          <p className="text-2xl font-bold text-slate-900 mt-1">
            Rp {totalAmount.toLocaleString("id-ID")}
          </p>
          <span className="text-xs text-slate-500 mt-0.5 block">
            {invoices.length} total transaksi tercatat
          </span>
        </div>

        <div className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-xs">
          <span className="text-xs text-emerald-600 font-medium uppercase tracking-wider">
            Sudah Lunas
          </span>
          <p className="text-2xl font-bold text-emerald-600 mt-1">
            Rp {paidAmount.toLocaleString("id-ID")}
          </p>
          <span className="text-xs text-slate-500 mt-0.5 block">
            {paidInvoices.length} faktur terbayar
          </span>
        </div>

        <div className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-xs">
          <span className="text-xs text-amber-600 font-medium uppercase tracking-wider">
            Menunggu Pelunasan
          </span>
          <p className="text-2xl font-bold text-amber-600 mt-1">
            Rp {unpaidAmount.toLocaleString("id-ID")}
          </p>
          <span className="text-xs text-slate-500 mt-0.5 block">
            {unpaidInvoices.length} faktur belum lunas
          </span>
        </div>
      </div>

      {/* Toolbar Filter & Search */}
      <div className="bg-white border border-slate-200/80 p-4 rounded-2xl shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
          <button
            type="button"
            onClick={() => setStatusFilter("all")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
              statusFilter === "all"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Semua ({invoices.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("paid")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
              statusFilter === "paid"
                ? "bg-white text-emerald-700 shadow-xs"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Lunas ({paidInvoices.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("unpaid")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
              statusFilter === "unpaid"
                ? "bg-white text-amber-700 shadow-xs"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Belum Lunas ({unpaidInvoices.length})
          </button>
        </div>

        {/* Search */}
        <div className="w-full sm:max-w-xs">
          <input
            type="text"
            placeholder="Cari nomor faktur / pelanggan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-950 focus:bg-white transition"
          />
        </div>
      </div>

      {/* Tabel Faktur */}
      {loading ? (
        <div className="text-center py-16 text-slate-500 bg-white rounded-2xl border border-slate-200/80">
          <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-sm">Memuat data faktur...</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-600 text-xs uppercase font-semibold border-b border-slate-200/80">
                <tr>
                  <th className="p-4 w-12 text-center">No</th>
                  <th className="p-4">Nomor Faktur</th>
                  <th className="p-4">Pelanggan</th>
                  <th className="p-4">Gudang</th>
                  <th className="p-4 text-center">Tanggal</th>
                  <th className="p-4 text-right">Total Tagihan</th>
                  <th className="p-4 text-center">Status Pembayaran</th>
                  <th className="p-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredInvoices.length > 0 ? (
                  filteredInvoices.map((inv, i) => {
                    const isPaid = inv.status === "paid";

                    return (
                      <tr key={inv.id} className="hover:bg-slate-50/70 transition">
                        <td className="p-4 text-center text-xs text-slate-400 font-mono">
                          {i + 1}
                        </td>
                        <td className="p-4 font-semibold text-slate-900">
                          {inv.invoiceNumber}
                        </td>
                        <td className="p-4 text-slate-700">
                          {inv.customerName || "-"}
                        </td>
                        <td className="p-4 text-slate-500 text-xs">
                          {inv.locationName || "-"}
                        </td>
                        <td className="p-4 text-center text-xs text-slate-600">
                          {new Date(inv.createdAt).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </td>
                        <td className="p-4 text-right font-bold text-slate-900">
                          Rp {inv.totalAmount.toLocaleString("id-ID")}
                        </td>

                        {/* Status Toggle Pill */}
                        <td className="p-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(inv)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition cursor-pointer select-none active:scale-95 border ${
                              isPaid
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                                : "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
                            }`}
                            title="Klik untuk ubah status"
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                isPaid ? "bg-emerald-500" : "bg-amber-500"
                              }`}
                            />
                            <span>{isPaid ? "Lunas" : "Belum Lunas"}</span>
                          </button>
                        </td>

                        {/* Aksi */}
                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleEdit(inv)}
                              disabled={isPaid}
                              title={isPaid ? "Faktur lunas tidak dapat diedit" : "Edit Faktur"}
                              className={`p-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 transition cursor-pointer ${
                                isPaid ? "opacity-40 cursor-not-allowed" : ""
                              }`}
                            >
                              <Edit size={14} />
                            </button>

                            <button
                              onClick={() => handlePrint(inv)}
                              title="Cetak Faktur"
                              className="p-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                            >
                              <Printer size={14} />
                            </button>

                            <button
                              onClick={() => handleDelete(inv)}
                              disabled={isPaid}
                              title={isPaid ? "Faktur lunas tidak dapat dihapus" : "Hapus Faktur"}
                              className={`p-2 rounded-xl text-rose-600 hover:bg-rose-50 transition cursor-pointer ${
                                isPaid ? "opacity-40 cursor-not-allowed" : ""
                              }`}
                            >
                              <Trash size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td
                      colSpan={8}
                      className="p-12 text-center text-slate-400"
                    >
                      Tidak ada data faktur yang cocok dengan filter
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Invoice */}
      {showModal && (
        <InvoiceModal
          open={showModal}
          onClose={() => setShowModal(false)}
          onSuccess={fetchInvoices}
          invoice={editingInvoice}
        />
      )}
    </div>
  );
}
