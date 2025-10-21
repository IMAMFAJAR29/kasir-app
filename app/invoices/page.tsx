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
  const [editingInvoice, setEditingInvoice] = useState<any | null>(null);

  // 🔹 Ambil semua faktur
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

  // 🔹 Edit faktur → fetch detail dari backend
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

  // 🔹 Cetak faktur
  const handlePrint = (inv: Invoice) => {
    window.open(`/invoices/print/${inv.id}`, "_blank");
  };

  // 🔹 Toggle status paid/unpaid
  const handleToggleStatus = async (inv: Invoice) => {
    if (inv.status === "paid") return;

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

  // 🔹 Hapus faktur
  const handleDelete = async (inv: Invoice) => {
    if (inv.status === "paid") return;
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

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">Transaksi Faktur</h1>
        <Button
          onClick={() => {
            setEditingInvoice(null);
            setShowModal(true);
          }}
          className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition"
        >
          <Plus size={18} />
          Tambah Faktur Baru
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-10 text-gray-500">Memuat data...</div>
      ) : (
        <div className="bg-white shadow-md rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-700">
              <tr>
                <th className="p-3 text-left w-12">No</th>
                <th className="p-3 text-left">Nomor Faktur</th>
                <th className="p-3 text-left">Pelanggan</th>
                <th className="p-3 text-left">Gudang</th>
                <th className="p-3 text-center">Tanggal</th>
                <th className="p-3 text-right">Total</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {invoices.length > 0 ? (
                invoices.map((inv, i) => (
                  <tr key={inv.id} className="border-t hover:bg-gray-50">
                    <td className="p-3 text-center">{i + 1}</td>
                    <td className="p-3 font-medium">{inv.invoiceNumber}</td>
                    <td className="p-3">{inv.customerName ?? "-"}</td>
                    <td className="p-3">{inv.locationName ?? "-"}</td>
                    <td className="p-3 text-center">
                      {new Date(inv.createdAt).toLocaleDateString("id-ID")}
                    </td>
                    <td className="p-3 text-right">
                      Rp {inv.totalAmount.toLocaleString("id-ID")}
                    </td>
                    <td className="p-3 text-center">
                      <div
                        onClick={() => handleToggleStatus(inv)}
                        className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
                          inv.status === "paid" ? "bg-green-500" : "bg-gray-300"
                        }`}
                      >
                        <div
                          className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                            inv.status === "paid"
                              ? "translate-x-6"
                              : "translate-x-0"
                          }`}
                        />
                      </div>
                    </td>
                    <td className="p-3 text-center flex justify-center gap-2">
                      <button
                        onClick={() => handleEdit(inv)}
                        disabled={inv.status === "paid"}
                        className={`p-2 rounded-lg hover:bg-gray-200 transition ${
                          inv.status === "paid"
                            ? "opacity-50 cursor-not-allowed"
                            : ""
                        }`}
                      >
                        <Edit size={16} />
                      </button>

                      <button
                        onClick={() => handleDelete(inv)}
                        disabled={inv.status === "paid"}
                        className={`p-2 rounded-lg hover:bg-gray-200 transition ${
                          inv.status === "paid"
                            ? "opacity-50 cursor-not-allowed"
                            : ""
                        }`}
                      >
                        <Trash size={16} className="text-red-500" />
                      </button>

                      <button
                        onClick={() => handlePrint(inv)}
                        className="p-2 rounded-lg hover:bg-gray-200 transition"
                      >
                        <Printer size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={8}
                    className="p-5 text-center text-gray-500 italic"
                  >
                    Belum ada faktur
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

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
