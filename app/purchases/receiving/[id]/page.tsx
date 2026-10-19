"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Printer, Save } from "lucide-react";
import Swal from "sweetalert2";
import Button from "@/components/Button";
import { evaluateReceiptLine } from "@/lib/purchaseReceiving";

interface ProductOption {
  id: number;
  name: string;
  sku: string;
}

interface ReceiptItem {
  id: number;
  purchaseItemId: number;
  productId: number;
  expectedProductName: string;
  expectedSku: string;
  orderedQty: number;
  remainingQtyAtReceipt: number;
  deliveryQty: number;
  receivedQty: number;
  productMatches: boolean;
  actualProductId: number | null;
  actualProductName: string | null;
  difference: number;
  orderDifference: number;
  qcStatus: string;
  notes: string | null;
  product: ProductOption;
  actualProduct: ProductOption | null;
}

interface Receipt {
  id: number;
  receiptNumber: string;
  purchaseId: number;
  supplierDeliveryNumber: string | null;
  receivedAt: string;
  receivedBy: string | null;
  qcBy: string | null;
  status: string;
  notes: string | null;
  qcCompletedAt: string | null;
  completedAt: string | null;
  stockPostedAt: string | null;
  purchase: {
    purchaseNumber: string;
    locationId: number | null;
    supplier: { name: string; phone: string | null; address: string | null } | null;
    location: { name: string } | null;
  };
  items: ReceiptItem[];
  productOptions: ProductOption[];
}

type ReceiptAction = "save" | "submit_qc" | "complete_qc" | "complete";

const statusLabels: Record<string, string> = {
  DRAFT: "Draft",
  PENDING_QC: "Menunggu QC",
  QC_COMPLETED: "QC Selesai",
  COMPLETED: "Selesai",
};

const qcLabels: Record<string, string> = {
  MATCH: "Sesuai",
  SHORT: "Kurang",
  OVER: "Lebih",
  NOT_MATCH: "Tidak Sesuai",
  PENDING: "Belum diperiksa",
};

function dateValue(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ""
    : new Date(date.getTime() - date.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);
}

export default function PurchaseReceiptDetailPage() {
  const params = useParams<{ id: string }>();
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirmDiscrepancies, setConfirmDiscrepancies] = useState(false);
  const [error, setError] = useState("");

  const loadReceipt = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/purchases/receipts/${params.id}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Gagal memuat penerimaan.");
      setReceipt(data);
    } catch (loadError) {
      console.error("Gagal memuat detail penerimaan:", loadError);
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Gagal memuat penerimaan."
      );
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    void loadReceipt();
  }, [loadReceipt]);

  const hasDiscrepancies = useMemo(
    () =>
      receipt?.items.some((item) => {
        const qc = evaluateReceiptLine(
          item.deliveryQty,
          item.receivedQty,
          item.productMatches
        );
        return (
          qc.qcStatus !== "MATCH" ||
          item.deliveryQty > item.remainingQtyAtReceipt ||
          (item.receivedQty > 0 &&
            !item.productMatches &&
            !item.actualProductId)
        );
      }) ?? false,
    [receipt]
  );

  const updateReceipt = async (
    action: ReceiptAction,
    confirm = false
  ) => {
    if (!receipt) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/purchases/receipts/${receipt.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          supplierDeliveryNumber: receipt.supplierDeliveryNumber ?? "",
          receivedAt: receipt.receivedAt,
          notes: receipt.notes ?? "",
          items: receipt.items.map((item) => ({
            id: item.id,
            deliveryQty: item.deliveryQty,
            receivedQty: item.receivedQty,
            productMatches: item.productMatches,
            actualProductId: item.actualProductId,
            actualProductName: item.actualProductName ?? "",
            notes: item.notes ?? "",
          })),
          confirmDiscrepancies: confirm,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Gagal memperbarui penerimaan.");
      }
      setReceipt((current) =>
        current
          ? { ...data, productOptions: current.productOptions }
          : data
      );
      setConfirmDiscrepancies(false);
      if (action === "complete") {
        await Swal.fire(
          "Penerimaan selesai",
          "Stok telah diperbarui berdasarkan qty aktual yang dikonfirmasi.",
          "success"
        );
      } else if (action !== "save") {
        await Swal.fire(
          "Berhasil",
          action === "submit_qc"
            ? "Penerimaan dikirim ke proses QC."
            : "Pemeriksaan QC selesai. Tinjau selisih sebelum finalisasi.",
          "success"
        );
      } else {
        await Swal.fire("Tersimpan", "Perubahan penerimaan disimpan.", "success");
      }
    } catch (updateError) {
      console.error("Gagal memperbarui penerimaan:", updateError);
      setError(
        updateError instanceof Error
          ? updateError.message
          : "Gagal memperbarui penerimaan."
      );
    } finally {
      setSaving(false);
    }
  };

  const updateHeader = (field: "supplierDeliveryNumber" | "receivedAt" | "notes", value: string) => {
    setReceipt((current) => (current ? { ...current, [field]: value } : current));
  };

  const updateItem = (
    id: number,
    field:
      | "deliveryQty"
      | "receivedQty"
      | "productMatches"
      | "actualProductId"
      | "actualProductName"
      | "notes",
    value: string | number | boolean | null
  ) => {
    setReceipt((current) =>
      current
        ? {
            ...current,
            items: current.items.map((item) =>
              item.id === id
                ? field === "productMatches" && value === true
                  ? {
                      ...item,
                      productMatches: true,
                      actualProductId: null,
                      actualProductName: null,
                    }
                  : { ...item, [field]: value }
                : item
            ),
          }
        : current
    );
  };

  const printDeliveryNote = () => {
    if (!receipt) return;
    window.open(
      `/purchases/receiving/${receipt.id}/print`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  if (loading) {
    return <main className="p-8 text-sm text-slate-500">Memuat penerimaan...</main>;
  }
  if (!receipt) {
    return (
      <main className="mx-auto max-w-4xl p-8">
        <p role="alert" className="text-sm text-rose-700">
          {error || "Penerimaan tidak ditemukan."}
        </p>
        <Link href="/purchases/receiving" className="mt-4 inline-block text-sm underline">
          Kembali ke riwayat penerimaan
        </Link>
      </main>
    );
  }

  const editable = receipt.status === "DRAFT" || receipt.status === "PENDING_QC";

  return (
    <main className="mx-auto w-full max-w-screen-2xl space-y-5 px-4 py-8 sm:px-8 xl:px-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href="/purchases/receiving"
            className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-800"
          >
            <ArrowLeft size={14} />
            Riwayat Penerimaan
          </Link>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
            Penerimaan {receipt.receiptNumber}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700">
            {statusLabels[receipt.status] ?? receipt.status}
          </span>
          {receipt.status !== "DRAFT" && (
            <Button
              onClick={printDeliveryNote}
              className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <Printer size={15} />
              Cetak Surat Jalan
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
          {error}
        </div>
      )}

      <section className="grid gap-4 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-4">
        <div>
          <span className="text-xs text-slate-500">Nomor Pembelian</span>
          <p className="mt-1 text-sm font-semibold text-slate-900">
            {receipt.purchase.purchaseNumber}
          </p>
        </div>
        <div>
          <span className="text-xs text-slate-500">Pemasok</span>
          <p className="mt-1 text-sm font-medium text-slate-800">
            {receipt.purchase.supplier?.name ?? "-"}
          </p>
          {receipt.purchase.supplier?.phone && (
            <p className="text-xs text-slate-500">{receipt.purchase.supplier.phone}</p>
          )}
        </div>
        <div>
          <span className="text-xs text-slate-500">Gudang Tujuan</span>
          <p className="mt-1 text-sm font-medium text-slate-800">
            {receipt.purchase.location?.name ?? "-"}
          </p>
        </div>
        <div>
          <span className="text-xs text-slate-500">No. Penerimaan</span>
          <p className="mt-1 text-sm font-medium text-slate-800">
            {receipt.receiptNumber}
          </p>
        </div>
        <label className="text-xs font-medium text-slate-600">
          No. Surat Jalan Pemasok
          <input
            value={receipt.supplierDeliveryNumber ?? ""}
            disabled={!editable}
            onChange={(event) =>
              updateHeader("supplierDeliveryNumber", event.target.value)
            }
            maxLength={100}
            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal text-slate-800 disabled:bg-slate-50"
            placeholder="Wajib sebelum QC"
          />
        </label>
        <label className="text-xs font-medium text-slate-600">
          Tanggal Penerimaan
          <input
            type="datetime-local"
            value={dateValue(receipt.receivedAt)}
            disabled={!editable}
            onChange={(event) =>
              updateHeader(
                "receivedAt",
                event.target.value
                  ? new Date(event.target.value).toISOString()
                  : ""
              )
            }
            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal text-slate-800 disabled:bg-slate-50"
          />
        </label>
        <label className="text-xs font-medium text-slate-600 md:col-span-2">
          Catatan Penerimaan
          <input
            value={receipt.notes ?? ""}
            disabled={!editable}
            onChange={(event) => updateHeader("notes", event.target.value)}
            maxLength={2000}
            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal text-slate-800 disabled:bg-slate-50"
            placeholder="Catatan kondisi kemasan atau pemeriksaan"
          />
        </label>
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-800">
            Pemeriksaan produk per pengiriman
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Qty pembelian, qty pada Surat Jalan pemasok, dan qty aktual dicatat
            terpisah. Pengiriman dapat diterima bertahap.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1160px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
              <tr>
                <th className="px-3 py-3">Produk pada Pembelian</th>
                <th className="px-3 py-3 text-right">Qty Pesan</th>
                <th className="px-3 py-3 text-right">Sisa Pesanan</th>
                <th className="px-3 py-3 text-right">Qty Surat Jalan</th>
                <th className="px-3 py-3 text-right">Qty Aktual</th>
                <th className="px-3 py-3">Produk diterima</th>
                <th className="px-3 py-3">Hasil QC</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {receipt.items.map((item) => {
                const qc = evaluateReceiptLine(
                  item.deliveryQty,
                  item.receivedQty,
                  item.productMatches
                );
                const exceedsOrder =
                  item.deliveryQty > item.remainingQtyAtReceipt;
                const qtyDisabled = !editable;
                return (
                  <tr key={item.id} className="align-top">
                    <td className="px-3 py-3">
                      <p className="font-medium text-slate-900">
                        {item.expectedProductName}
                      </p>
                      <p className="text-xs text-slate-500">{item.expectedSku}</p>
                    </td>
                    <td className="px-3 py-3 text-right text-slate-700">
                      {item.orderedQty}
                    </td>
                    <td className="px-3 py-3 text-right text-slate-700">
                      {item.remainingQtyAtReceipt}
                    </td>
                    <td className="px-3 py-3 text-right">
                      <input
                        type="number"
                        min={0}
                        step={1}
                        value={item.deliveryQty}
                        disabled={qtyDisabled}
                        onChange={(event) =>
                          updateItem(
                            item.id,
                            "deliveryQty",
                            Math.max(0, Number(event.target.value))
                          )
                        }
                        aria-label={`Qty Surat Jalan ${item.expectedProductName}`}
                        className="w-24 rounded-md border border-slate-300 px-2 py-1.5 text-right disabled:bg-slate-50"
                      />
                      {exceedsOrder && (
                        <p className="mt-1 text-xs text-amber-700">
                          Melebihi sisa pesanan {item.deliveryQty - item.remainingQtyAtReceipt}
                        </p>
                      )}
                    </td>
                    <td className="px-3 py-3 text-right">
                      <input
                        type="number"
                        min={0}
                        step={1}
                        value={item.receivedQty}
                        disabled={qtyDisabled}
                        onChange={(event) =>
                          updateItem(
                            item.id,
                            "receivedQty",
                            Math.max(0, Number(event.target.value))
                          )
                        }
                        aria-label={`Qty aktual ${item.expectedProductName}`}
                        className="w-24 rounded-md border border-slate-300 px-2 py-1.5 text-right disabled:bg-slate-50"
                      />
                    </td>
                    <td className="px-3 py-3">
                      <label className="flex items-center gap-2 text-xs text-slate-700">
                        <input
                          type="checkbox"
                          checked={item.productMatches}
                          disabled={qtyDisabled}
                          onChange={(event) =>
                            updateItem(
                              item.id,
                              "productMatches",
                              event.target.checked
                            )
                          }
                        />
                        Produk sesuai
                      </label>
                      {!item.productMatches && (
                        <div className="mt-2 space-y-1.5">
                          <select
                            value={item.actualProductId ?? ""}
                            disabled={qtyDisabled}
                            onChange={(event) =>
                              updateItem(
                                item.id,
                                "actualProductId",
                                event.target.value
                                  ? Number(event.target.value)
                                  : null
                              )
                            }
                            className="max-w-64 rounded-md border border-amber-300 px-2 py-1.5 text-xs disabled:bg-slate-50"
                            aria-label={`Produk aktual untuk ${item.expectedProductName}`}
                          >
                            <option value="">Tidak terdaftar / karantina</option>
                            {receipt.productOptions.map((product) => (
                              <option key={product.id} value={product.id}>
                                {product.name} ({product.sku})
                              </option>
                            ))}
                          </select>
                          {!item.actualProductId && (
                            <input
                              value={item.actualProductName ?? ""}
                              disabled={qtyDisabled}
                              onChange={(event) =>
                                updateItem(
                                  item.id,
                                  "actualProductName",
                                  event.target.value
                                )
                              }
                              maxLength={200}
                              placeholder="Nama produk aktual"
                              aria-label={`Nama produk aktual ${item.expectedProductName}`}
                              className="block max-w-64 rounded-md border border-amber-300 px-2 py-1.5 text-xs disabled:bg-slate-50"
                            />
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={`inline-flex rounded-md border px-2 py-1 text-xs font-medium ${
                          qc.qcStatus === "MATCH"
                            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                              : "border-amber-200 bg-amber-50 text-amber-800"
                        }`}
                      >
                        {receipt.status === "PENDING_QC" ||
                        receipt.status === "DRAFT"
                          ? "Menunggu QC"
                          : qcLabels[qc.qcStatus]}
                      </span>
                      {receipt.status !== "DRAFT" &&
                        receipt.status !== "PENDING_QC" &&
                        qc.difference !== 0 && (
                          <p className="mt-1 text-xs text-slate-600">
                            Selisih SJ: {qc.difference > 0 ? "+" : ""}
                            {qc.difference}
                          </p>
                        )}
                      {!item.productMatches && item.actualProductId && (
                        <p className="mt-1 text-xs text-slate-500">
                          Qty aktual masuk ke stok produk terpilih.
                        </p>
                      )}
                      {!item.productMatches &&
                        !item.actualProductId &&
                        item.receivedQty > 0 && (
                          <p className="mt-1 max-w-48 text-xs text-amber-800">
                            Produk belum dipetakan; qty tidak menambah stok.
                          </p>
                        )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="flex flex-col justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center">
        <div className="text-xs text-slate-500">
          <p>Dibuat oleh: {receipt.receivedBy ?? "-"}</p>
          {receipt.qcBy && <p>QC oleh: {receipt.qcBy}</p>}
          {receipt.stockPostedAt && (
            <p>Stok diproses: {new Date(receipt.stockPostedAt).toLocaleString("id-ID")}</p>
          )}
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {receipt.status === "DRAFT" && (
            <>
              <Button
                onClick={() => updateReceipt("save")}
                disabled={saving}
                className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                <Save size={15} />
                Simpan Draft
              </Button>
              <Button
                onClick={() => updateReceipt("submit_qc")}
                disabled={saving}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
              >
                Kirim untuk QC
              </Button>
            </>
          )}
          {receipt.status === "PENDING_QC" && (
            <>
              <Button
                onClick={() => updateReceipt("save")}
                disabled={saving}
                className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                <Save size={15} />
                Simpan Perubahan
              </Button>
              <Button
                onClick={() => updateReceipt("complete_qc")}
                disabled={saving}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
              >
                Selesaikan QC
              </Button>
            </>
          )}
          {receipt.status === "QC_COMPLETED" && (
            <div className="flex flex-col items-end gap-3">
              <label className="flex max-w-xl items-start gap-2 text-xs text-slate-700">
                <input
                  type="checkbox"
                  checked={confirmDiscrepancies}
                  onChange={(event) =>
                    setConfirmDiscrepancies(event.target.checked)
                  }
                  className="mt-0.5"
                />
                <span>
                  Saya telah memeriksa dan mengonfirmasi hasil penerimaan
                  {hasDiscrepancies ? ", termasuk seluruh selisih yang ditampilkan" : ""}.
                  Stok hanya bertambah untuk qty aktual yang teridentifikasi.
                </span>
              </label>
              <Button
                onClick={() => updateReceipt("complete", confirmDiscrepancies)}
                disabled={saving || !confirmDiscrepancies}
                className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Konfirmasi & Selesaikan Penerimaan
              </Button>
            </div>
          )}
          {receipt.status === "COMPLETED" && (
            <p className="text-sm font-medium text-emerald-800">
              Penerimaan selesai; posting stok tercatat satu kali.
            </p>
          )}
        </div>
      </section>
    </main>
  );
}
