"use client";
import { InvoiceItem, Customer, Location } from "@/types/invoice";
import { formatRupiah } from "@/lib/invoiceHelpers";

interface Props {
  invoiceNumber: string;
  customers: Customer[];
  locations: Location[];
  selectedCustomer: number | null;
  selectedLocation: number | null;
  refText: string;
  dueDate: string;
  notes: string;
  items: InvoiceItem[];
  totalAmount: number;
}

export default function InvoicePreview({
  invoiceNumber,
  customers,
  locations,
  selectedCustomer,
  selectedLocation,
  refText,
  dueDate,
  notes,
  items,
  totalAmount,
}: Props) {
  return (
    <div id="invoice-preview" className="hidden p-4 bg-white">
      <h2 className="text-xl font-bold mb-2">Invoice {invoiceNumber}</h2>
      <p>
        Pelanggan:{" "}
        {customers.find((c) => c.id === selectedCustomer)?.name || "-"}
      </p>
      <p>
        Lokasi: {locations.find((l) => l.id === selectedLocation)?.name || "-"}
      </p>
      <p>Ref: {refText}</p>
      <p>Jatuh Tempo: {dueDate}</p>
      <table className="w-full mt-4 border-collapse border border-gray-300">
        <thead>
          <tr className="bg-gray-100">
            <th className="border p-2">Nama</th>
            <th className="border p-2">Qty</th>
            <th className="border p-2">Harga</th>
            <th className="border p-2">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => (
            <tr key={idx}>
              <td className="border p-2">{item.name}</td>
              <td className="border p-2">{item.qty}</td>
              <td className="border p-2">{formatRupiah(item.price)}</td>
              <td className="border p-2">{formatRupiah(item.subtotal)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={3} className="text-right font-bold p-2">
              Total
            </td>
            <td className="border p-2 font-bold">
              {formatRupiah(totalAmount)}
            </td>
          </tr>
        </tfoot>
      </table>
      {notes && <p className="mt-2">Catatan: {notes}</p>}
    </div>
  );
}
