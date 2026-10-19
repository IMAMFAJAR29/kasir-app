"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ClipboardCheck, ExternalLink, Plus, Printer } from "lucide-react";
import Swal from "sweetalert2";
import Button from "@/components/Button";

interface PurchaseOption {
  id: number;
  purchaseNumber: string;
  supplierName?: string;
  locationName?: string;
}

interface ReceiptRow {
  id: number;
  receiptNumber: string;
  supplierDeliveryNumber: string | null;
  receivedAt: string;
  status: string;
  purchase: {
    purchaseNumber: string;
    supplier: { name: string } | null;
    location: { name: string } | null;
  };
  _count: { items: number };
}

const statusLabels: Record<string, string> = {
  DRAFT: "Draft",
  PENDING_QC: "Menunggu QC",
  QC_COMPLETED: "QC Selesai",
  COMPLETED: "Selesai",
};

export default function PurchaseReceivingPage() {
  const router = useRouter();
  const [purchases, setPurchases] = useState<PurchaseOption[]>([]);
  const [receipts, setReceipts] = useState<ReceiptRow[]>([]);
  const [selectedPurchaseId, setSelectedPurchaseId] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const requestKey = useRef<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [purchaseResponse, receiptResponse] = await Promise.all([
        fetch("/api/purchases"),
        fetch("/api/purchases/receipts"),
      ]);
      if (!purchaseResponse.ok || !receiptResponse.ok) {
        throw new Error("Gagal memuat pembelian atau riwayat penerimaan.");
      }
      const [purchaseData, receiptData] = await Promise.all([
        purchaseResponse.json(),
        receiptResponse.json(),
      ]);
      setPurchases(purchaseData);
      setReceipts(receiptData);
    } catch (loadError) {
      console.error("Gagal memuat halaman penerimaan:", loadError);
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Gagal memuat data penerimaan."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const createReceipt = async () => {
    if (!selectedPurchaseId) {
      setError("Pilih nomor pembelian terlebih dahulu.");
      return;
    }

    setCreating(true);
    setError("");
    requestKey.current ??= crypto.randomUUID();
    try {
      const response = await fetch("/api/purchases/receipts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          purchaseId: Number(selectedPurchaseId),
          requestKey: requestKey.current,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Gagal memulai penerimaan.");
      }
      requestKey.current = null;
      router.push(`/purchases/receiving/${data.id}`);
    } catch (createError) {
      console.error("Gagal memulai penerimaan:", createError);
      setError(
        createError instanceof Error
          ? createError.message
          : "Gagal memulai penerimaan."
      );
    } finally {
      setCreating(false);
    }
  };

  const printReceipt = async (receipt: ReceiptRow) => {
    if (receipt.status === "DRAFT") {
      await Swal.fire(
        "Penerimaan masih Draft",
        "Lengkapi data dan kirim untuk QC sebelum mencetak Surat Jalan.",
        "info"
      );
      return;
    }
    window.open(
      `/purchases/receiving/${receipt.id}/print`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  return (
    <main className="mx-auto w-full max-w-screen-2xl space-y-6 px-4 py-8 sm:px-8 xl:px-10">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <Link
            href="/purchases"
            className="text-xs font-medium text-slate-500 hover:text-slate-800"
          >
            Pembelian
          </Link>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
            Penerimaan Barang
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Catat pengiriman bertahap, cocokkan Surat Jalan, dan selesaikan QC
            sebelum stok gudang diperbarui.
          </p>
        </div>
      </header>

      <section className="grid gap-4 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-[1fr_auto] sm:items-end">
        <div>
          <label
            htmlFor="purchase-order"
            className="mb-1.5 block text-xs font-semibold text-slate-600"
          >
            Nomor Pembelian
          </label>
          <select
            id="purchase-order"
            value={selectedPurchaseId}
            onChange={(event) => {
              requestKey.current = null;
              setSelectedPurchaseId(event.target.value);
            }}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-slate-500 focus:outline-none"
          >
            <option value="">Pilih nomor pembelian...</option>
            {purchases.map((purchase) => (
              <option key={purchase.id} value={purchase.id}>
                {purchase.purchaseNumber} — {purchase.supplierName ?? "Pemasok"}
                {purchase.locationName ? ` — ${purchase.locationName}` : ""}
              </option>
            ))}
          </select>
        </div>
        <Button
          onClick={createReceipt}
          disabled={creating || loading || !selectedPurchaseId}
          className="flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus size={16} />
          {creating ? "Membuat Draft..." : "Mulai Penerimaan"}
        </Button>
        {error && (
          <p role="alert" className="text-sm text-rose-700 sm:col-span-2">
            {error}
          </p>
        )}
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-3">
          <ClipboardCheck size={17} className="text-slate-500" />
          <h2 className="text-sm font-semibold text-slate-800">
            Riwayat Penerimaan
          </h2>
        </div>
        {loading ? (
          <p className="p-8 text-center text-sm text-slate-500">
            Memuat riwayat...
          </p>
        ) : receipts.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-500">
            Belum ada penerimaan barang.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                <tr>
                  <th className="px-4 py-3">No. Penerimaan</th>
                  <th className="px-4 py-3">Pembelian / Pemasok</th>
                  <th className="px-4 py-3">No. Surat Jalan</th>
                  <th className="px-4 py-3">Tanggal Terima</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {receipts.map((receipt) => (
                  <tr key={receipt.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {receipt.receiptNumber}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800">
                        {receipt.purchase.purchaseNumber}
                      </div>
                      <div className="text-xs text-slate-500">
                        {receipt.purchase.supplier?.name ?? "Pemasok"}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {receipt.supplierDeliveryNumber || "Belum diisi"}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {new Date(receipt.receivedAt).toLocaleDateString("id-ID")}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-700">
                        {statusLabels[receipt.status] ?? receipt.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Link
                          href={`/purchases/receiving/${receipt.id}`}
                          aria-label={`Buka ${receipt.receiptNumber}`}
                          className="rounded-md border border-slate-200 p-2 text-slate-700 hover:bg-slate-100"
                        >
                          <ExternalLink size={15} />
                        </Link>
                        <button
                          type="button"
                          onClick={() => printReceipt(receipt)}
                          aria-label={`Cetak Surat Jalan ${receipt.receiptNumber}`}
                          className="rounded-md border border-slate-200 p-2 text-slate-700 hover:bg-slate-100"
                        >
                          <Printer size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
