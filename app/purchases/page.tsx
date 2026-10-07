"use client";

import { useState, useEffect } from "react";
import { Trash, Edit, Printer, Plus } from "lucide-react";
import Swal from "sweetalert2";
import Button from "@/components/Button";
import PurchaseModal from "@/components/purchases/purchaseModal";
import { formatRupiah } from "@/lib/invoiceHelpers";

interface Purchase {
  id: number;
  purchaseNumber: string;
  createdAt: string;
  totalAmount: number;
  supplierName?: string;
  locationName?: string;
}

export default function PurchasePage() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState<Purchase | null>(null);

  // Fetch semua pembelian
  const fetchPurchases = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/purchases");
      if (!res.ok) throw new Error("Gagal memuat data pembelian");
      const data = await res.json();
      setPurchases(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPurchases();
  }, []);

  // Edit transaksi
  const handleEdit = (purchase: Purchase) => {
    setEditingPurchase(purchase);
    setShowModal(true);
  };

  // Hapus transaksi
  const handleDelete = async (purchase: Purchase) => {
    const confirm = await Swal.fire({
      title: "Hapus Pembelian?",
      text: `Apakah kamu yakin ingin menghapus ${purchase.purchaseNumber}?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Ya, hapus",
    });
    if (!confirm.isConfirmed) return;

    try {
      const res = await fetch(`/api/purchases/${purchase.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Gagal hapus pembelian");
      setPurchases((prev) => prev.filter((p) => p.id !== purchase.id));
      Swal.fire("Terhapus!", "Pembelian berhasil dihapus", "success");
    } catch (err) {
      Swal.fire("Error", "Gagal menghapus pembelian", "error");
    }
  };

  const handlePrint = (purchase: Purchase) => {
    console.log("ID purchase:", purchase.id);
    window.open(`/purchases/print/${purchase.id}`, "_blank");
  };

  const [search, setSearch] = useState("");

  const totalPurchasesAmount = purchases.reduce(
    (sum, p) => sum + Number(p.totalAmount || 0),
    0
  );

  const filteredPurchases = purchases.filter((p) => {
    return (
      p.purchaseNumber.toLowerCase().includes(search.toLowerCase()) ||
      (p.supplierName && p.supplierName.toLowerCase().includes(search.toLowerCase())) ||
      (p.locationName && p.locationName.toLowerCase().includes(search.toLowerCase()))
    );
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Transaksi Pembelian
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Kelola pengadaan barang masuk, faktur pembelian pemasok, dan retur
          </p>
        </div>

        <Button
          onClick={() => {
            setEditingPurchase(null);
            setShowModal(true);
          }}
          className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white shadow-xs"
        >
          <Plus size={16} />
          <span>Tambah Pembelian Baru</span>
        </Button>
      </div>

      {/* Metric Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-xs">
          <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">
            Total Pengeluaran Pembelian
          </span>
          <p className="text-2xl font-bold text-slate-900 mt-1">
            {formatRupiah(totalPurchasesAmount)}
          </p>
          <span className="text-xs text-slate-500 mt-0.5 block">
            Akumulasi seluruh transaksi pengadaan
          </span>
        </div>

        <div className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-xs">
          <span className="text-xs text-indigo-600 font-medium uppercase tracking-wider">
            Total Faktur Pembelian
          </span>
          <p className="text-2xl font-bold text-indigo-600 mt-1">
            {purchases.length} Transaksi
          </p>
          <span className="text-xs text-slate-500 mt-0.5 block">
            Faktur dari berbagai pemasok aktif
          </span>
        </div>
      </div>

      {/* Toolbar Search */}
      <div className="bg-white border border-slate-200/80 p-4 rounded-2xl shadow-xs flex justify-between items-center">
        <div className="w-full sm:max-w-xs">
          <input
            type="text"
            placeholder="Cari no pembelian / pemasok..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-950 focus:bg-white transition"
          />
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-16 text-slate-500 bg-white rounded-2xl border border-slate-200/80">
          <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-sm">Memuat data pembelian...</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-600 text-xs uppercase font-semibold border-b border-slate-200/80">
                <tr>
                  <th className="p-4 w-12 text-center">No</th>
                  <th className="p-4">No Pembelian</th>
                  <th className="p-4">Pemasok</th>
                  <th className="p-4">Gudang Tujuan</th>
                  <th className="p-4 text-center">Tanggal</th>
                  <th className="p-4 text-right">Total Pembelian</th>
                  <th className="p-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPurchases.length > 0 ? (
                  filteredPurchases.map((purchase, i) => (
                    <tr key={purchase.id} className="hover:bg-slate-50/70 transition">
                      <td className="p-4 text-center text-xs text-slate-400 font-mono">
                        {i + 1}
                      </td>
                      <td className="p-4 font-semibold text-slate-900">
                        {purchase.purchaseNumber}
                      </td>
                      <td className="p-4 text-slate-700">
                        {purchase.supplierName ?? "-"}
                      </td>
                      <td className="p-4 text-slate-500 text-xs">
                        {purchase.locationName ?? "-"}
                      </td>
                      <td className="p-4 text-center text-xs text-slate-600">
                        {new Date(purchase.createdAt).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="p-4 text-right font-bold text-slate-900">
                        {formatRupiah(purchase.totalAmount)}
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleEdit(purchase)}
                            title="Edit Transaksi"
                            className="p-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            onClick={() => handlePrint(purchase)}
                            title="Cetak Faktur Pembelian"
                            className="p-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                          >
                            <Printer size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(purchase)}
                            title="Hapus Pembelian"
                            className="p-2 rounded-xl text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                          >
                            <Trash size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={7}
                      className="p-12 text-center text-slate-400"
                    >
                      Belum ada data transaksi pembelian
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Purchase */}
      {showModal && (
        <PurchaseModal
          open={showModal}
          onClose={() => setShowModal(false)}
          onSuccess={fetchPurchases}
          purchase={editingPurchase}
        />
      )}
    </div>
  );
}
