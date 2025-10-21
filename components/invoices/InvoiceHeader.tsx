"use client";
import { Customer, Location } from "@/types/invoice";

interface Props {
  invoiceNumber: string;
  customers: Customer[];
  locations: Location[];
  selectedCustomer: number | null;
  selectedLocation: number | null;
  refText: string;
  dueDate: string;
  notes: string;
  onChangeCustomer: (id: number) => void;
  onChangeLocation: (id: number) => void;
  onChangeRef: (val: string) => void;
  onChangeDueDate: (val: string) => void;
  onChangeNotes: (val: string) => void;
  onChangeInvoiceNumber: (val: string) => void;
}

export default function InvoiceHeader({
  invoiceNumber,
  customers,
  locations,
  selectedCustomer,
  selectedLocation,
  refText,
  dueDate,
  notes,
  onChangeCustomer,
  onChangeLocation,
  onChangeRef,
  onChangeDueDate,
  onChangeNotes,
  onChangeInvoiceNumber,
}: Props) {
  return (
    <div className="bg-white shadow-lg p-6 space-y-4 mb-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <input
          type="text"
          placeholder="No Faktur"
          value={invoiceNumber}
          onChange={(e) => onChangeInvoiceNumber(e.target.value)}
          className="w-full px-4 py-3 rounded-lg shadow focus:outline-none focus:ring-2 focus:ring-black/30"
        />
        <select
          value={selectedCustomer || ""}
          onChange={(e) => onChangeCustomer(Number(e.target.value))}
          className="w-full px-4 py-3 rounded-lg shadow focus:outline-none focus:ring-2 focus:ring-black/30"
        >
          <option value="">Pilih Pelanggan</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          value={selectedLocation || ""}
          onChange={(e) => onChangeLocation(Number(e.target.value))}
          className="w-full px-4 py-3 rounded-lg shadow focus:outline-none focus:ring-2 focus:ring-black/30"
        >
          <option value="">Pilih Lokasi</option>
          {locations.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <input
          type="text"
          placeholder="Ref"
          value={refText}
          onChange={(e) => onChangeRef(e.target.value)}
          className="w-full px-4 py-3 rounded-lg shadow focus:outline-none focus:ring-2 focus:ring-black/30"
        />
        <input
          type="date"
          placeholder="Due Date"
          value={dueDate}
          onChange={(e) => onChangeDueDate(e.target.value)}
          className="w-full px-4 py-3 rounded-lg shadow focus:outline-none focus:ring-2 focus:ring-black/30"
        />
      </div>

      <textarea
        placeholder="Catatan"
        value={notes}
        onChange={(e) => onChangeNotes(e.target.value)}
        className="w-full px-4 py-3 rounded-lg shadow focus:outline-none focus:ring-2 focus:ring-black/30"
      />
    </div>
  );
}
