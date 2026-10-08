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
    <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <label>
        <span className="form-label">No. Faktur</span>
        <input
          type="text"
          placeholder="No Faktur"
          value={invoiceNumber}
          onChange={(e) => onChange("invoiceNumber", e.target.value)}
          className="form-control"
        />
      </label>
      <label>
        <span className="form-label">No. Referensi</span>
        <input
          type="text"
          placeholder="No Ref"
          value={refNo}
          onChange={(e) => onChange("refNo", e.target.value)}
          className="form-control"
        />
      </label>
      <label>
        <span className="form-label">Salesman</span>
        <input
          type="text"
          placeholder="Nama salesman"
          value={salesman}
          onChange={(e) => onChange("salesman", e.target.value)}
          className="form-control"
        />
      </label>
      <label>
        <span className="form-label">Tanggal</span>
        <input
          type="date"
          value={date}
          onChange={(e) => onChange("date", e.target.value)}
          className="form-control"
        />
      </label>
      <label>
        <span className="form-label">Termin (hari)</span>
        <input
          type="number"
          placeholder="Termin (hari)"
          value={termin ?? ""}
          onChange={(e) => onChange("termin", Number(e.target.value))}
          className="form-control"
        />
      </label>
      <label>
        <span className="form-label">Jatuh Tempo</span>
        <input
          type="date"
          value={dueDate}
          readOnly
          className="form-control"
        />
      </label>
      <label>
        <span className="form-label">Pelanggan</span>
        <select
          value={customerId ?? ""}
          onChange={(e) => onChange("customerId", Number(e.target.value))}
          className="form-control"
        >
          <option value="">Pilih Pelanggan</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span className="form-label">Gudang</span>
        <select
          value={locationId ?? ""}
          onChange={(e) => onChange("locationId", Number(e.target.value))}
          className="form-control"
        >
          <option value="">Pilih Gudang</option>
          {locations.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
