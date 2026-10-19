"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

interface PrintReceipt {
  receiptNumber: string;
  supplierDeliveryNumber: string | null;
  receivedAt: string;
  notes: string | null;
  purchase: {
    purchaseNumber: string;
    supplier: { name: string; phone: string | null; address: string | null } | null;
    location: { name: string } | null;
  };
  items: {
    id: number;
    expectedProductName: string;
    expectedSku: string;
    orderedQty: number;
    deliveryQty: number;
    productMatches: boolean;
    actualProductName: string | null;
    actualProduct: { name: string; sku: string } | null;
  }[];
}

export default function PrintDeliveryNotePage() {
  const { id } = useParams<{ id: string }>();
  const [receipt, setReceipt] = useState<PrintReceipt | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const response = await fetch(`/api/purchases/receipts/${id}`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Gagal memuat Surat Jalan.");
        if (!cancelled) setReceipt(data);
      } catch (loadError) {
        console.error("Gagal memuat Surat Jalan:", loadError);
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Gagal memuat Surat Jalan."
          );
        }
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (!receipt) return;
    const timer = window.setTimeout(() => window.print(), 500);
    return () => window.clearTimeout(timer);
  }, [receipt]);

  if (error) return <main className="p-8 text-sm text-rose-700">{error}</main>;
  if (!receipt) return <main className="p-8 text-sm text-slate-500">Memuat Surat Jalan...</main>;

  return (
    <main className="delivery-note mx-auto min-h-screen max-w-[210mm] bg-white px-8 py-10 text-slate-900">
      <style jsx global>{`
        @page {
          size: A4 portrait;
          margin: 14mm;
        }
        @media print {
          html,
          body {
            background: #fff !important;
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          .delivery-note {
            max-width: none !important;
            min-height: 0 !important;
            padding: 0 !important;
          }
        }
      `}</style>

      <header className="border-b-2 border-slate-900 pb-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          Dokumen Penerimaan Barang
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">SURAT JALAN</h1>
        <p className="mt-1 text-sm text-slate-600">
          Bukti pengiriman barang dari pemasok
        </p>
      </header>

      <section className="mt-6 grid grid-cols-2 gap-8 text-sm">
        <div className="space-y-1.5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Pemasok
          </p>
          <p className="font-semibold">{receipt.purchase.supplier?.name ?? "-"}</p>
          {receipt.purchase.supplier?.address && (
            <p className="whitespace-pre-line text-slate-600">
              {receipt.purchase.supplier.address}
            </p>
          )}
          {receipt.purchase.supplier?.phone && (
            <p className="text-slate-600">Tel. {receipt.purchase.supplier.phone}</p>
          )}
        </div>
        <div className="grid grid-cols-[145px_1fr] gap-y-2">
          <span className="text-slate-500">Nomor penerimaan</span>
          <span className="font-semibold">{receipt.receiptNumber}</span>
          <span className="text-slate-500">Nomor Surat Jalan</span>
          <span className="font-semibold">
            {receipt.supplierDeliveryNumber || "-"}
          </span>
          <span className="text-slate-500">Nomor pembelian</span>
          <span className="font-semibold">{receipt.purchase.purchaseNumber}</span>
          <span className="text-slate-500">Tanggal</span>
          <span>
            {new Date(receipt.receivedAt).toLocaleDateString("id-ID", {
              day: "2-digit",
              month: "long",
              year: "numeric",
            })}
          </span>
          <span className="text-slate-500">Gudang tujuan</span>
          <span>{receipt.purchase.location?.name ?? "-"}</span>
        </div>
      </section>

      <section className="mt-8">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-y border-slate-400 bg-slate-50 text-left">
              <th className="w-12 px-3 py-2.5 text-center">No.</th>
              <th className="px-3 py-2.5">Nama barang</th>
              <th className="w-36 px-3 py-2.5">SKU</th>
              <th className="w-28 px-3 py-2.5 text-right">Qty pesanan</th>
              <th className="w-28 px-3 py-2.5 text-right">Qty dikirim</th>
            </tr>
          </thead>
          <tbody>
            {receipt.items.map((item, index) => (
              <tr key={item.id} className="border-b border-slate-200">
                <td className="px-3 py-3 text-center">{index + 1}</td>
                <td className="px-3 py-3 font-medium">
                  {!item.productMatches
                    ? item.actualProduct?.name ||
                      item.actualProductName ||
                      `Tidak sesuai: ${item.expectedProductName}`
                    : item.expectedProductName}
                  {!item.productMatches && (
                    <span className="ml-2 text-xs font-semibold uppercase text-amber-700">
                      (pengganti)
                    </span>
                  )}
                </td>
                <td className="px-3 py-3 text-slate-600">
                  {!item.productMatches
                    ? item.actualProduct?.sku || "-"
                    : item.expectedSku}
                </td>
                <td className="px-3 py-3 text-right">{item.orderedQty}</td>
                <td className="px-3 py-3 text-right font-semibold">
                  {item.deliveryQty}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {receipt.notes && (
        <section className="mt-5 text-sm">
          <p className="font-semibold">Catatan</p>
          <p className="mt-1 whitespace-pre-line text-slate-700">{receipt.notes}</p>
        </section>
      )}

      <section className="mt-12 grid grid-cols-3 gap-8 text-center text-sm">
        {["Diserahkan oleh", "Diterima oleh", "Pemeriksa QC"].map((label) => (
          <div key={label}>
            <p className="font-medium">{label}</p>
            <div className="mt-20 border-t border-slate-400 pt-2 text-xs text-slate-500">
              Nama, tanda tangan & tanggal
            </div>
          </div>
        ))}
      </section>

      <footer className="mt-10 border-t border-slate-200 pt-3 text-center text-[10px] text-slate-500">
        Dokumen ini digunakan untuk verifikasi barang terhadap Purchase Order.
      </footer>
    </main>
  );
}
