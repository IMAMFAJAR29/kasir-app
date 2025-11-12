"use client";

import { formatRupiah } from "@/lib/invoiceHelpers";

interface InvoiceTotalsProps {
  subtotal: number;
  tax: number | null;
  discount: number;
  shipping: number;
  taxes: any[];
  onChangeTax: (value: number | null) => void;
  onChangeDiscount: (value: number) => void;
  onChangeShipping: (value: number) => void;
}

export default function InvoiceTotals({
  subtotal,
  tax,
  discount,
  shipping,
  taxes,
  onChangeTax,
  onChangeDiscount,
  onChangeShipping,
}: InvoiceTotalsProps) {
  // Pastikan semua nilai numerik valid
  const cleanSubtotal = Number(subtotal) || 0;
  const cleanShipping = Number(shipping) || 0;
  const cleanDiscount = Number(discount) || 0;
  const cleanTaxRate = Number(tax) || 0;

  // Hitung pajak berdasarkan rate (%)
  const taxAmount = (cleanTaxRate / 100) * cleanSubtotal;

  // Total keseluruhan
  const total = cleanSubtotal + taxAmount + cleanShipping - cleanDiscount;

  return (
    <div className="bg-white shadow-md rounded-xl p-4 mt-6 space-y-4">
      {/* Header */}
      <h3 className="text-lg font-bold border-b pb-2">Ringkasan Faktur</h3>

      {/* Subtotal */}
      <div className="flex justify-between text-sm">
        <span>Subtotal</span>
        <span>{formatRupiah(cleanSubtotal)}</span>
      </div>

      {/* Pajak */}
      <div className="flex justify-between text-sm items-center">
        <span>Pajak</span>
        <select
          value={tax ?? ""}
          onChange={(e) =>
            onChangeTax(e.target.value ? Number(e.target.value) : null)
          }
          className="rounded-xl px-2 py-1 shadow-sm focus:shadow-md outline-none transition w-32 text-right"
        >
          <option value="">Tidak Ada</option>
          {taxes.map((t) => (
            <option key={t.id} value={t.rate}>
              {t.name} ({t.rate}%)
            </option>
          ))}
        </select>
      </div>

      {/* Tampilkan jumlah pajak bila ada */}
      {tax && (
        <div className="flex justify-between text-sm text-gray-600">
          <span>Jumlah Pajak</span>
          <span>{formatRupiah(taxAmount)}</span>
        </div>
      )}

      {/* Ongkir */}
      <div className="flex justify-between text-sm items-center">
        <span>Ongkir</span>
        <input
          type="number"
          placeholder="0"
          inputMode="numeric"
          pattern="[0-9]*"
          value={cleanShipping}
          onChange={(e) => onChangeShipping(Number(e.target.value) || 0)}
          className="rounded-xl px-2 py-1 shadow-sm focus:shadow-md outline-none transition w-32 text-right"
        />
      </div>

      {/* Diskon */}
      <div className="flex justify-between text-sm items-center">
        <span>Diskon</span>
        <input
          type="number"
          placeholder="0"
          inputMode="numeric"
          pattern="[0-9]*"
          value={cleanDiscount}
          onChange={(e) => onChangeDiscount(Number(e.target.value) || 0)}
          className="rounded-xl px-2 py-1 shadow-sm focus:shadow-md outline-none transition w-32 text-right"
        />
      </div>

      <hr />

      {/* Total */}
      <div className="flex justify-between text-base font-semibold">
        <span>Total</span>
        <span className="text-lg font-bold text-green-600">
          {formatRupiah(total)}
        </span>
      </div>
    </div>
  );
}
