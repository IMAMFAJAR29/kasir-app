"use client";

import { Purchase } from "@/types/purchases";

// Kita definisikan tipe khusus untuk state form,
// karena form biasanya punya field tambahan yang tidak selalu ada di model Purchase.
export interface PurchaseFormState extends Partial<Purchase> {
  buyer?: string;
  termin?: number;
  dueDate?: string;
  discount?: number;
  shipping?: number;
  notes?: string;
}

interface PurchaseFormProps {
  formState: PurchaseFormState;
  updateField: (field: keyof PurchaseFormState, value: any) => void;
  customers: any[];
  locations: any[];
}

export default function PurchaseForm({
  formState,
  updateField,
  customers,
  locations,
}: PurchaseFormProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Supplier / Pemasok */}
      <div>
        <label className="block mb-1 font-medium">Pemasok</label>
        <select
          value={formState.supplierId || ""}
          onChange={(e) => updateField("supplierId", Number(e.target.value))}
          className="rounded-lg w-full p-2 shadow-sm outline-none border"
        >
          <option value="">Pilih Pemasok</option>
          {/* customers di sini berperan sebagai daftar pemasok */}
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* Lokasi Gudang */}
      <div>
        <label className="block mb-1 font-medium">Lokasi Gudang</label>
        <select
          value={formState.locationId || ""}
          onChange={(e) => updateField("locationId", Number(e.target.value))}
          className="rounded-lg w-full p-2 shadow-sm outline-none border"
        >
          <option value="">Pilih Lokasi</option>
          {locations.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
      </div>

      {/* Ref No */}
      <div>
        <label className="block mb-1 font-medium">Ref No</label>
        <input
          type="text"
          value={formState.refNo || ""}
          onChange={(e) => updateField("refNo", e.target.value)}
          className="rounded-lg w-full p-2 shadow-sm outline-none border"
        />
      </div>

      {/* Pembeli */}
      <div>
        <label className="block mb-1 font-medium">Pembeli</label>
        <input
          type="text"
          value={formState.buyer || ""}
          onChange={(e) => updateField("buyer", e.target.value)}
          className="rounded-lg w-full p-2 shadow-sm outline-none border"
        />
      </div>

      {/* Tanggal */}
      <div>
        <label className="block mb-1 font-medium">Tanggal</label>
        <input
          type="date"
          value={formState.date || ""}
          onChange={(e) => updateField("date", e.target.value)}
          className="rounded-lg w-full p-2 shadow-sm outline-none border"
        />
      </div>

      {/* Termin (hari) */}
      <div>
        <label className="block mb-1 font-medium">Termin (hari)</label>
        <input
          type="number"
          value={formState.termin || 0}
          onChange={(e) => updateField("termin", Number(e.target.value))}
          className="rounded-lg w-full p-2 shadow-sm outline-none border"
        />
      </div>

      {/* Tanggal Jatuh Tempo */}
      <div>
        <label className="block mb-1 font-medium">Jatuh Tempo</label>
        <input
          type="date"
          value={formState.dueDate || ""}
          onChange={(e) => updateField("dueDate", e.target.value)}
          className="rounded-lg w-full p-2 shadow-sm outline-none border"
        />
      </div>

      {/* Diskon */}
      <div>
        <label className="block mb-1 font-medium">Diskon</label>
        <input
          type="number"
          value={formState.discount || 0}
          onChange={(e) => updateField("discount", Number(e.target.value))}
          className="rounded-lg w-full p-2 shadow-sm outline-none border"
        />
      </div>

      {/* Ongkir */}
      <div>
        <label className="block mb-1 font-medium">Biaya Pengiriman</label>
        <input
          type="number"
          value={formState.shipping || 0}
          onChange={(e) => updateField("shipping", Number(e.target.value))}
          className="rounded-lg w-full p-2 shadow-sm outline-none border"
        />
      </div>

      {/* Catatan */}
      <div className="col-span-2">
        <label className="block mb-1 font-medium">Catatan</label>
        <textarea
          value={formState.notes || ""}
          onChange={(e) => updateField("notes", e.target.value)}
          className="rounded-lg w-full p-2 shadow-sm outline-none border"
          rows={3}
          placeholder="Tuliskan catatan tambahan..."
        />
      </div>
    </div>
  );
}
