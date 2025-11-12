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

  // Cetak transaksi
  const handlePrint = (purchase: Purchase) => {
    console.log("ID purchase:", purchase.id);
    window.open(`/purchases/print/${purchase.id}`, "_blank");
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">Transaksi Pembelian</h1>
        <Button
          onClick={() => {
            setEditingPurchase(null);
            setShowModal(true);
          }}
          className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition"
        >
          <Plus size={18} />
          Tambah Pembelian Baru
        </Button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-10 text-gray-500">Memuat data...</div>
      ) : (
        <div className="bg-white shadow-md rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-700">
              <tr>
                <th className="p-3 text-left w-12">No</th>
                <th className="p-3 text-left">No Pembelian</th>
                <th className="p-3 text-left">Pemasok</th>
                <th className="p-3 text-left">Gudang</th>
                <th className="p-3 text-center">Tanggal</th>
                <th className="p-3 text-right">Total</th>
                <th className="p-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {purchases.length > 0 ? (
                purchases.map((purchase, i) => (
                  <tr key={purchase.id} className="border-t hover:bg-gray-50">
                    <td className="p-3 text-center">{i + 1}</td>
                    <td className="p-3 font-medium">
                      {purchase.purchaseNumber}
                    </td>
                    <td className="p-3">{purchase.supplierName ?? "-"}</td>
                    <td className="p-3">{purchase.locationName ?? "-"}</td>
                    <td className="p-3 text-center">
                      {new Date(purchase.createdAt).toLocaleDateString("id-ID")}
                    </td>
                    <td className="p-3 text-right">
                      {formatRupiah(purchase.totalAmount)}
                    </td>
                    <td className="p-3 text-center flex justify-center gap-2">
                      <button
                        onClick={() => handleEdit(purchase)}
                        className="p-2 rounded-lg hover:bg-gray-200 transition"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(purchase)}
                        className="p-2 rounded-lg hover:bg-gray-200 transition"
                      >
                        <Trash size={16} className="text-red-500" />
                      </button>
                      <button
                        onClick={() => handlePrint(purchase)}
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
                    colSpan={7}
                    className="p-5 text-center text-gray-500 italic"
                  >
                    Belum ada pembelian
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <PurchaseModal
          open={showModal}
          purchase={editingPurchase}
          onClose={() => setShowModal(false)}
          onSuccess={fetchPurchases}
        />
      )}
    </div>
  );
}
