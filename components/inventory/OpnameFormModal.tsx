"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Plus, Search, Trash2 } from "lucide-react";
import Swal from "sweetalert2";
import Modal from "@/components/Modal";
import Button from "@/components/Button";
import { Badge } from "@/components/ui/badge";

interface LocationOption {
  id: number;
  name: string;
}

interface StockRow {
  id: number;
  name: string;
  sku: string;
  stock: number;
  isBundle: boolean;
}

interface CountLine {
  productId: number;
  name: string;
  sku: string;
  systemQty: number;
  countedQty: number;
}

interface OpnameFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  locations: LocationOption[];
}

export default function OpnameFormModal({
  isOpen,
  onClose,
  onSuccess,
  locations,
}: OpnameFormModalProps) {
  const [locationId, setLocationId] = useState<number | null>(null);
  const [stock, setStock] = useState<StockRow[]>([]);
  const [search, setSearch] = useState("");
  const [lines, setLines] = useState<CountLine[]>([]);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setLocationId((current) => current ?? locations[0]?.id ?? null);
    setLines([]);
    setNote("");
    setSearch("");
  }, [isOpen, locations]);

  useEffect(() => {
    if (!isOpen || locationId === null) return;
    let cancelled = false;
    setLoading(true);
    fetch(`/api/warehouse/stock?locationId=${locationId}`)
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) {
          throw new Error(body.error || "Gagal memuat stok gudang.");
        }
        if (!cancelled) setStock(Array.isArray(body) ? body : []);
      })
      .catch(() => {
        if (!cancelled) setStock([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, locationId]);

  const selectedIds = useMemo(
    () => new Set(lines.map((line) => line.productId)),
    [lines]
  );

  const availableProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    return stock
      .filter((product) => !product.isBundle)
      .filter(
        (product) =>
          !query ||
          product.name.toLowerCase().includes(query) ||
          product.sku.toLowerCase().includes(query)
      )
      .slice(0, 40);
  }, [search, stock]);

  const addLine = (product: StockRow) => {
    setLines((current) => {
      if (current.some((line) => line.productId === product.id)) return current;
      return [
        ...current,
        {
          productId: product.id,
          name: product.name,
          sku: product.sku,
          systemQty: product.stock,
          countedQty: product.stock,
        },
      ];
    });
  };

  const updateCounted = (productId: number, raw: string) => {
    const parsed = Number(raw);
    setLines((current) =>
      current.map((line) =>
        line.productId === productId
          ? {
              ...line,
              countedQty: Number.isFinite(parsed)
                ? Math.max(0, Math.floor(parsed))
                : 0,
            }
          : line
      )
    );
  };

  const removeLine = (productId: number) => {
    setLines((current) => current.filter((line) => line.productId !== productId));
  };

  const totalDifference = lines.reduce(
    (sum, line) => sum + (line.countedQty - line.systemQty),
    0
  );

  const handleSubmit = async () => {
    if (saving) return;
    if (locationId === null) {
      await Swal.fire("Gudang belum dipilih", "Pilih gudang opname.", "warning");
      return;
    }
    if (lines.length === 0) {
      await Swal.fire("Belum ada produk", "Tambahkan minimal satu produk.", "warning");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/inventory/opnames", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locationId,
          note,
          items: lines.map((line) => ({
            productId: line.productId,
            countedQty: line.countedQty,
          })),
        }),
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error || "Gagal membuat opname.");
      }
      onClose();
      onSuccess();
      await Swal.fire(
        "Draft opname dibuat",
        `Nomor ${body.no}. Ajukan approval setelah penghitungan selesai.`,
        "success"
      );
    } catch (error) {
      await Swal.fire(
        "Gagal membuat opname",
        error instanceof Error ? error.message : "Terjadi kesalahan.",
        "error"
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Buat Sesi Stock Opname"
      description="Masukkan hasil hitung fisik. Sesi disimpan sebagai draft dan belum mengubah stok."
      maxWidth="max-w-4xl"
    >
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-semibold text-slate-700">
            Gudang
            <select
              value={locationId ?? ""}
              onChange={(event) => {
                setLocationId(Number(event.target.value));
                setLines([]);
              }}
              className="form-control mt-1.5"
            >
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-semibold text-slate-700">
            Catatan
            <input
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Opsional"
              className="form-control mt-1.5"
            />
          </label>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rounded-xl border border-slate-200">
            <div className="border-b border-slate-100 p-3">
              <p className="text-sm font-semibold text-slate-800">Pilih produk</p>
              <div className="relative mt-2">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Cari produk atau SKU..."
                  className="form-control w-full pl-9"
                />
              </div>
            </div>
            <div className="max-h-72 overflow-y-auto p-2">
              {loading ? (
                <p className="flex items-center gap-2 p-3 text-sm text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Memuat stok...
                </p>
              ) : (
                availableProducts.map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => addLine(product)}
                    disabled={selectedIds.has(product.id)}
                    className="flex w-full items-center justify-between gap-3 rounded-lg px-2.5 py-2 text-left text-sm transition hover:bg-slate-50 disabled:opacity-40"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-slate-800">
                        {product.name}
                      </span>
                      <span className="text-xs text-slate-400">{product.sku}</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      <Badge variant="info">{product.stock}</Badge>
                      <Plus className="h-4 w-4 text-slate-400" />
                    </span>
                  </button>
                ))
              )}
            </div>
          </section>

          <section className="rounded-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 p-3">
              <p className="text-sm font-semibold text-slate-800">
                Hasil hitung fisik
              </p>
              <Badge variant={totalDifference === 0 ? "success" : "warning"}>
                Selisih {totalDifference > 0 ? `+${totalDifference}` : totalDifference}
              </Badge>
            </div>
            <div className="max-h-72 overflow-y-auto">
              {lines.length === 0 ? (
                <p className="p-6 text-center text-sm text-slate-500">
                  Belum ada produk dipilih.
                </p>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-3 py-2">Produk</th>
                      <th className="px-3 py-2 text-center">Sistem</th>
                      <th className="px-3 py-2 text-center">Fisik</th>
                      <th className="px-3 py-2" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {lines.map((line) => (
                      <tr key={line.productId}>
                        <td className="px-3 py-2">
                          <p className="font-medium text-slate-800">{line.name}</p>
                          <p className="text-xs text-slate-400">{line.sku}</p>
                        </td>
                        <td className="px-3 py-2 text-center text-slate-600">
                          {line.systemQty}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <input
                            type="number"
                            min={0}
                            value={line.countedQty}
                            onChange={(event) =>
                              updateCounted(line.productId, event.target.value)
                            }
                            className="w-20 rounded-lg border border-slate-200 px-2 py-1 text-center text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                          />
                        </td>
                        <td className="px-3 py-2 text-right">
                          <button
                            type="button"
                            onClick={() => removeLine(line.productId)}
                            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                            aria-label={`Hapus ${line.name}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Batal
          </Button>
          <Button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={saving || lines.length === 0}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            {saving ? "Menyimpan..." : "Simpan Draft"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
