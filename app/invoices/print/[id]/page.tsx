"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

export default function PrintInvoicePage() {
  const { id } = useParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // 🔹 Ambil data faktur dari API
  useEffect(() => {
    if (!id) return;
    const fetchData = async () => {
      try {
        const res = await fetch(`/api/invoices/${id}`);
        if (!res.ok) throw new Error("Gagal memuat data faktur");
        const json = await res.json();
        setData(json);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  // 🔹 Cetak otomatis setelah data siap
  useEffect(() => {
    if (data) {
      const timer = setTimeout(() => window.print(), 800); // delay sedikit biar render penuh
      return () => clearTimeout(timer);
    }
  }, [data]);

  if (loading)
    return <div className="p-6 text-gray-500">Memuat data faktur...</div>;
  if (!data)
    return <div className="p-6 text-red-500">Data faktur tidak ditemukan.</div>;

  // 🔹 Hitung subtotal, pajak, dan total akhir
  const subtotal = data.items.reduce(
    (sum: number, i: any) => sum + Number(i.subtotal),
    0
  );
  const discount = Number(data.discount || 0);
  const shipping = Number(data.shipping || 0);
  const taxRate = data.tax ? Number(data.tax.rate) : 0;
  const taxableAmount = subtotal - discount;
  const taxAmount = data.tax ? (taxableAmount * taxRate) / 100 : 0;
  const totalFinal = taxableAmount + taxAmount + shipping;

  return (
    // 🔹 Wrapper utama untuk area cetak
    <div id="printArea" className="print-wrapper">
      <div className="max-w-3xl mx-auto p-8 bg-white text-gray-800 print:shadow-none print:bg-white">
        {/* Header */}
        <div className="text-center border-b pb-4 mb-6">
          <h1 className="text-2xl font-bold">FAKTUR PENJUALAN</h1>
          <p className="text-sm text-gray-600">Nomor: {data.invoiceNumber}</p>
        </div>

        {/* Info Faktur */}
        <div className="grid grid-cols-2 text-sm mb-6">
          <div>
            <p>
              <strong>Tanggal:</strong>{" "}
              {new Date(data.createdAt).toLocaleDateString("id-ID")}
            </p>
            <p>
              <strong>Pelanggan:</strong> {data.customer?.name || "-"}
            </p>
            <p>
              <strong>Gudang:</strong> {data.location?.name || "-"}
            </p>
          </div>
          <div className="text-right">
            <p>
              <strong>Total:</strong> Rp {totalFinal.toLocaleString("id-ID")}
            </p>
          </div>
        </div>

        {/* Daftar Produk */}
        <table className="w-full text-sm border border-gray-300 mb-6">
          <thead className="bg-gray-100 border-b">
            <tr>
              <th className="p-2 text-left">Produk</th>
              <th className="p-2 text-center w-16">Qty</th>
              <th className="p-2 text-right w-24">Harga</th>
              <th className="p-2 text-right w-24">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item: any) => (
              <tr key={item.id} className="border-b last:border-none">
                <td className="p-2">{item.product.name}</td>
                <td className="p-2 text-center">{item.qty}</td>
                <td className="p-2 text-right">
                  Rp {Number(item.price).toLocaleString("id-ID")}
                </td>
                <td className="p-2 text-right">
                  Rp {Number(item.subtotal).toLocaleString("id-ID")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Ringkasan */}
        <div className="text-right space-y-1 text-sm">
          <p>Subtotal: Rp {subtotal.toLocaleString("id-ID")}</p>
          <p>Diskon: Rp {discount.toLocaleString("id-ID")}</p>
          {data.tax && (
            <p>
              Pajak ({data.tax.name} - {taxRate}%): Rp{" "}
              {taxAmount.toLocaleString("id-ID")}
            </p>
          )}
          <p>Ongkir: Rp {shipping.toLocaleString("id-ID")}</p>
          {data.notes && <p>Catatan: {data.notes}</p>}
          <hr className="border-t border-gray-300 my-1" />
          <p className="font-semibold text-lg">
            Total Akhir: Rp {totalFinal.toLocaleString("id-ID")}
          </p>
        </div>
      </div>
    </div>
  );
}
