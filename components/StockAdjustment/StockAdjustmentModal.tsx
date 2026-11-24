"use client";

import { useState, useEffect } from "react";
import Button from "@/components/Button";
import Modal from "@/components/Modal";
import Swal from "sweetalert2";
import { Product } from "@/types/products";

interface Location {
  id: number;
  name: string;
}

type AdjustmentMode = "set" | "add" | "subtract";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  locationId: number;
  products: Product[];
  locations: Location[];
}

interface AdjustmentLine {
  productId: number;
  name: string;
  sku: string;
  onHand: number;
  mode: AdjustmentMode;
  value: number | "";
}

const toNumber = (value: number | "") => (value === "" ? 0 : Number(value));

const computeNewQuantity = (line: AdjustmentLine) => {
  if (line.mode === "add") return line.onHand + toNumber(line.value);
  if (line.mode === "subtract") return line.onHand - toNumber(line.value);
  return toNumber(line.value);
};

export default function StockAdjustmentModal({
  isOpen,
  onClose,
  onSuccess,
  locationId,
  products,
  locations,
}: Props) {
  const [adjustmentNo, setAdjustmentNo] = useState(`ADJ-${Date.now()}`);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [note, setNote] = useState("");
  const [items, setItems] = useState<AdjustmentLine[]>([]);
  const [saving, setSaving] = useState(false);

  // Setiap kali modal dibuka, buat nomor baru dan bersihkan catatan agar
  // penyesuaian berikutnya tidak memakai nomor yang sama.
  useEffect(() => {
    if (!isOpen) return;
    setAdjustmentNo(`ADJ-${Date.now()}`);
    setDate(new Date().toISOString().split("T")[0]);
    setNote("");
  }, [isOpen]);

  useEffect(() => {
    setItems(
      products.map((p) => ({
        productId: p.id,
        name: p.name,
        sku: p.sku,
        onHand: p.stock,
        mode: "set" as AdjustmentMode,
        value: p.stock,
      }))
    );
  }, [products, locationId]);

  const activeLocation = locations.find((location) => location.id === locationId);

  const updateLine = (productId: number, updates: Partial<AdjustmentLine>) => {
    setItems((prev) =>
      prev.map((line) =>
        line.productId === productId ? { ...line, ...updates } : line
      )
    );
  };

  const changeMode = (productId: number, mode: AdjustmentMode) => {
    setItems((prev) =>
      prev.map((line) =>
        line.productId === productId
          ? {
              ...line,
              mode,
              // Mode set memakai stok sistem sebagai titik awal; mode
              // tambah/kurang dimulai kosong agar user memasukkan delta.
              value: mode === "set" ? line.onHand : "",
            }
          : line
      )
    );
  };

  const handleSubmit = async () => {
    if (saving) return;

    for (const line of items) {
      const value = line.value === "" ? Number.NaN : Number(line.value);
      if (!Number.isSafeInteger(value)) {
        await Swal.fire(
          "Jumlah tidak valid",
          `Isi jumlah penyesuaian untuk ${line.name} dengan bilangan bulat.`,
          "warning"
        );
        return;
      }
      if (line.mode === "set" && value < 0) {
        await Swal.fire(
          "Stok tidak valid",
          `Stok akhir ${line.name} tidak boleh negatif.`,
          "warning"
        );
        return;
      }
      if (line.mode !== "set" && value <= 0) {
        await Swal.fire(
          "Jumlah tidak valid",
          `Jumlah tambah/kurang untuk ${line.name} harus lebih dari 0.`,
          "warning"
        );
        return;
      }
      if (line.mode === "subtract" && value > line.onHand) {
        await Swal.fire(
          "Stok tidak cukup",
          `${line.name}: stok tersedia ${line.onHand}, diminta kurangi ${value}.`,
          "warning"
        );
        return;
      }
    }

    setSaving(true);
    try {
      const res = await fetch("/api/warehouse/adjustments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          no: adjustmentNo,
          date,
          locationId,
          note,
          items: items.map((line) => ({
            productId: line.productId,
            mode: line.mode,
            value: Number(line.value),
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok)
        throw new Error(data.message || "Gagal menyimpan penyesuaian stok");

      Swal.fire({
        icon: "success",
        title: "Berhasil",
        text: "Penyesuaian stok berhasil disimpan!",
        timer: 2000,
        showConfirmButton: false,
      });

      onClose();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      Swal.fire({
        icon: "error",
        title: "Gagal",
        text: err.message || "Terjadi kesalahan",
      });
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Penyesuaian Stok">
      <div className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              Nomor Penyesuaian
            </label>
            <input
              type="text"
              value={adjustmentNo}
              onChange={(e) => setAdjustmentNo(e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              Tanggal Penyesuaian
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              Lokasi / Gudang
            </label>
            <div className="w-full px-3.5 py-2 text-sm bg-slate-100 rounded-xl border border-slate-200 text-slate-600">
              {activeLocation?.name || `Lokasi #${locationId}`}
            </div>
            <p className="mt-1 text-[11px] text-slate-400">
              Mengikuti gudang yang dipilih pada halaman stok.
            </p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              Alasan Penyesuaian (Opsional)
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              placeholder="Contoh: Stok opname fisik, barang rusak, koreksi input"
            />
          </div>
        </div>

        <div className="border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm">
          <div className="max-h-72 overflow-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200/80 text-xs font-semibold text-slate-500 uppercase tracking-wider sticky top-0">
                <tr>
                  <th className="px-4 py-3">Produk</th>
                  <th className="px-4 py-3">SKU</th>
                  <th className="px-4 py-3 text-center">Stok Sistem</th>
                  <th className="px-4 py-3">Mode</th>
                  <th className="px-4 py-3 text-center">Jumlah</th>
                  <th className="px-4 py-3 text-center">Stok Akhir</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item) => {
                  const newQuantity = computeNewQuantity(item);
                  const isInvalid = newQuantity < 0;
                  return (
                    <tr key={item.productId} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-2.5 font-medium text-slate-900">{item.name}</td>
                      <td className="px-4 py-2.5 text-slate-500 font-mono text-xs">{item.sku}</td>
                      <td className="px-4 py-2.5 text-center font-semibold text-slate-700">
                        {item.onHand}
                      </td>
                      <td className="px-4 py-2.5">
                        <select
                          value={item.mode}
                          onChange={(e) =>
                            changeMode(item.productId, e.target.value as AdjustmentMode)
                          }
                          className="w-full min-w-[110px] rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        >
                          <option value="set">Set stok</option>
                          <option value="add">Tambah</option>
                          <option value="subtract">Kurangi</option>
                        </select>
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <input
                          type="number"
                          min={item.mode === "set" ? 0 : 1}
                          value={item.value}
                          onChange={(e) =>
                            updateLine(item.productId, {
                              value: e.target.value === "" ? "" : Number(e.target.value),
                            })
                          }
                          className={`w-24 px-2 py-1.5 text-center font-semibold rounded-lg border outline-none focus:bg-white focus:ring-2 ${
                            isInvalid
                              ? "border-rose-300 bg-rose-50 text-rose-700 focus:ring-rose-500/20 focus:border-rose-500"
                              : "border-indigo-200 bg-indigo-50/50 text-indigo-700 focus:ring-indigo-500/20 focus:border-indigo-500"
                          }`}
                          placeholder={item.mode === "set" ? "0" : "0"}
                        />
                      </td>
                      <td
                        className={`px-4 py-2.5 text-center font-bold ${
                          isInvalid ? "text-rose-600" : "text-slate-900"
                        }`}
                      >
                        {isInvalid ? "Tidak valid" : newQuantity}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button onClick={onClose} variant="secondary">
            Batal
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={saving}
            className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20"
          >
            {saving ? "Menyimpan..." : "Simpan Penyesuaian"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
