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
    <Modal isOpen={isOpen} onClose={onClose} title="Penyesuaian Stok">
      <div className="space-y-4">
        <div className="bg-white shadow-lg rounded-lg p-4 flex gap-4">
          <input
            type="text"
            value={adjustmentNo}
            onChange={(e) => setAdjustmentNo(e.target.value)}
            className="border p-2 rounded flex-1"
          />
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="border p-2 rounded"
          />
        </div>

        <div className="flex flex-col gap-2">
          <select
            value={location}
            onChange={(e) => setLocation(Number(e.target.value))}
            className="border p-2 rounded"
          >
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.name}
              </option>
            ))}
          </select>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="border p-2 rounded"
            placeholder="Keterangan"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-3 py-2 text-left">Produk</th>
                <th className="px-3 py-2 text-left">SKU</th>
                <th className="px-3 py-2 text-left">On Hand</th>
                <th className="px-3 py-2 text-center">Penyesuaian</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.productId} className="hover:bg-gray-50">
                  <td className="px-3 py-2">{item.name}</td>
                  <td className="px-3 py-2">{item.sku}</td>
                  <td className="px-3 py-2">{item.onHand}</td>
                  <td className="px-3 py-2 text-center">
                    <input
                      type="number"
                      value={item.newQuantity}
                      onChange={(e) =>
                        handleChangeQuantity(item.productId, e.target.value)
                      }
                      className="border p-1 rounded w-20 text-center"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end gap-2">
          <Button onClick={onClose} variant="secondary">
            Batal
          </Button>
          <Button onClick={handleSubmit}>Simpan Penyesuaian</Button>
        </div>
      </div>
    </Modal>
  );
}
