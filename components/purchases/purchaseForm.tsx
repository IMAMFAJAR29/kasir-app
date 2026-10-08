"use client";

import { Purchase } from "@/types/purchases";

// Kita definisikan tipe khusus untuk state form,
// karena form biasanya punya field tambahan yang tidak selalu ada di model Purchase.
export interface PurchaseFormState extends Partial<Purchase> {
  buyer?: string;
  termin?: number;
  dueDate?: string;
  discount?: number | "";
  shipping?: number | "";
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
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* Supplier / Pemasok */}
      <div>
        <label className="form-label">Pemasok</label>
        <select
          value={formState.supplierId || ""}
          onChange={(e) => updateField("supplierId", Number(e.target.value))}
          className="form-control"
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
        <label className="form-label">Lokasi Gudang</label>
        <select
          value={formState.locationId || ""}
          onChange={(e) => updateField("locationId", Number(e.target.value))}
          className="form-control"
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
        <label className="form-label">No. Referensi</label>
        <input
          type="text"
          value={formState.refNo || ""}
          onChange={(e) => updateField("refNo", e.target.value)}
          className="form-control"
        />
      </div>

      {/* Pembeli */}
      <div>
        <label className="form-label">Pembeli</label>
        <input
          type="text"
          value={formState.buyer || ""}
          onChange={(e) => updateField("buyer", e.target.value)}
          className="form-control"
        />
      </div>

      {/* Tanggal */}
      <div>
        <label className="form-label">Tanggal</label>
        <input
          type="date"
          value={formState.date || ""}
          onChange={(e) => updateField("date", e.target.value)}
          className="form-control"
        />
      </div>

      {/* Termin (hari) */}
      <div>
        <label className="form-label">Termin (hari)</label>
        <input
          type="number"
          value={formState.termin || 0}
          onChange={(e) => updateField("termin", Number(e.target.value))}
          className="form-control"
        />
      </div>

      {/* Tanggal Jatuh Tempo */}
      <div>
        <label className="form-label">Jatuh Tempo</label>
        <input
          type="date"
          value={formState.dueDate || ""}
          onChange={(e) => updateField("dueDate", e.target.value)}
          className="form-control"
        />
      </div>

      {/* Diskon */}
      <div>
        <label className="form-label">Diskon</label>
        <input
          type="number"
          value={formState.discount ?? ""}
          onChange={(e) =>
            updateField(
              "discount",
              e.target.value === "" ? "" : Number(e.target.value)
            )
          }
          className="form-control"
        />
      </div>

      {/* Ongkir */}
      <div>
        <label className="form-label">Biaya Pengiriman</label>
        <input
          type="number"
          value={formState.shipping ?? ""}
          onChange={(e) =>
            updateField(
              "shipping",
              e.target.value === "" ? "" : Number(e.target.value)
            )
          }
          className="form-control"
        />
      </div>

      {/* Catatan */}
      <div className="sm:col-span-2 lg:col-span-4">
        <label className="form-label">Catatan</label>
        <textarea
          value={formState.notes || ""}
          onChange={(e) => updateField("notes", e.target.value)}
          className="form-control"
          rows={3}
          placeholder="Tuliskan catatan tambahan..."
        />
      </div>
    </div>
  );
}
