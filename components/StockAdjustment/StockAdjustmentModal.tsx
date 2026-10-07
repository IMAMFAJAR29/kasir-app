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

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  locationId: number;
  products: Product[];
  locations: Location[];
}

interface StockAdjustmentItem {
  productId: number;
  name: string;
  sku: string;
  onHand: number;
  newQuantity: number | "";
}

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
  const [location, setLocation] = useState(locationId);
  const [note, setNote] = useState("");
  const [items, setItems] = useState<StockAdjustmentItem[]>([]);

  useEffect(() => {
    setItems(
      products.map((p) => ({
        productId: p.id,
        name: p.name,
        sku: p.sku,
        onHand: p.stock,
        newQuantity: p.stock,
      }))
    );
    setLocation(locationId);
  }, [products, locationId]);

  const handleChangeQuantity = (productId: number, value: string) => {
    const num = value === "" ? "" : Number(value);
    setItems((prev) =>
      prev.map((i) =>
        i.productId === productId ? { ...i, newQuantity: num } : i
      )
    );
  };

  const handleSubmit = async () => {
    try {
      const res = await fetch("/api/warehouse/adjustments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          no: adjustmentNo,
          date,
          locationId: location,
          note,
          items: items.map((i) => ({
            productId: i.productId,
            newQuantity: i.newQuantity === "" ? 0 : i.newQuantity,
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
    }
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Penyesuaian Stok Fisik">
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
            <select
              value={location}
              onChange={(e) => setLocation(Number(e.target.value))}
              className="w-full px-3.5 py-2 text-sm bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            >
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              Catatan / Alasan (Opsional)
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              placeholder="Contoh: Stok opname fisik bulanan"
            />
          </div>
        </div>

        <div className="border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm">
          <div className="max-h-64 overflow-y-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200/80 text-xs font-semibold text-slate-500 uppercase tracking-wider sticky top-0">
                <tr>
                  <th className="px-4 py-3">Produk</th>
                  <th className="px-4 py-3">SKU</th>
                  <th className="px-4 py-3 text-center">Stok Sistem</th>
                  <th className="px-4 py-3 text-center">Stok Nyata (Fisik)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item) => (
                  <tr key={item.productId} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-2.5 font-medium text-slate-900">{item.name}</td>
                    <td className="px-4 py-2.5 text-slate-500 font-mono text-xs">{item.sku}</td>
                    <td className="px-4 py-2.5 text-center font-semibold text-slate-700">
                      {item.onHand}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <input
                        type="number"
                        min="0"
                        value={item.newQuantity}
                        onChange={(e) =>
                          handleChangeQuantity(item.productId, e.target.value)
                        }
                        className="w-24 px-2 py-1.5 text-center font-semibold text-indigo-700 bg-indigo-50/50 rounded-lg border border-indigo-200 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button onClick={onClose} variant="secondary">
            Batal
          </Button>
          <Button onClick={handleSubmit} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20">
            Simpan Penyesuaian
          </Button>
        </div>
      </div>
    </Modal>
  );
}
