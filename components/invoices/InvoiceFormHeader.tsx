"use client";

interface InvoiceFormHeaderProps {
  invoiceNumber: string;
  refNo: string;
  salesman: string;
  date: string;
  termin: number | null;
  dueDate: string;
  customerId: number | null;
  locationId: number | null;
  customers: any[];
  locations: any[];
  onChange: (field: string, value: any) => void;
}

export default function InvoiceFormHeader({
  invoiceNumber,
  refNo,
  salesman,
  date,
  termin,
  dueDate,
  customerId,
  locationId,
  customers,
  locations,
  onChange,
}: InvoiceFormHeaderProps) {
  return (
    <div className="grid grid-cols-2 gap-4 mb-6">
      <input
        type="text"
        placeholder="No Faktur"
        value={invoiceNumber}
        onChange={(e) => onChange("invoiceNumber", e.target.value)}
        className="rounded-xl px-4 py-2 shadow-sm focus:shadow-md outline-none transition w-full"
      />
      <input
        type="text"
        placeholder="No Ref"
        value={refNo}
        onChange={(e) => onChange("refNo", e.target.value)}
        className="rounded-xl px-4 py-2 shadow-sm focus:shadow-md outline-none transition w-full"
      />
      <input
        type="text"
        placeholder="Salesman"
        value={salesman}
        onChange={(e) => onChange("salesman", e.target.value)}
        className="rounded-xl px-4 py-2 shadow-sm focus:shadow-md outline-none transition w-full"
      />
      <input
        type="date"
        value={date}
        onChange={(e) => onChange("date", e.target.value)}
        className="rounded-xl px-4 py-2 shadow-sm focus:shadow-md outline-none transition w-full text-gray-700"
      />
      <input
        type="number"
        placeholder="Termin (hari)"
        value={termin ?? ""}
        onChange={(e) => onChange("termin", Number(e.target.value))}
        className="rounded-xl px-4 py-2 shadow-sm focus:shadow-md outline-none transition w-full"
      />
      <input
        type="date"
        placeholder="Jatuh Tempo"
        value={dueDate}
        readOnly
        className="rounded-xl px-4 py-2 shadow-sm focus:shadow-md outline-none transition w-full text-gray-700"
      />
      <select
        value={customerId ?? ""}
        onChange={(e) => onChange("customerId", Number(e.target.value))}
        className="rounded-xl px-4 py-2 shadow-sm focus:shadow-md outline-none transition w-full"
      >
        <option value="">Pilih Pelanggan</option>
        {customers.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <select
        value={locationId ?? ""}
        onChange={(e) => onChange("locationId", Number(e.target.value))}
        className="rounded-xl px-4 py-2 shadow-sm focus:shadow-md outline-none transition w-full"
      >
        <option value="">Pilih Gudang</option>
        {locations.map((l) => (
          <option key={l.id} value={l.id}>
            {l.name}
          </option>
        ))}
      </select>
    </div>
  );
}
