"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeftRight,
  CheckCircle2,
  Loader2,
  Plus,
  Search,
  Trash2,
  Warehouse,
  XCircle,
} from "lucide-react";
import Swal from "sweetalert2";
import { useSession } from "next-auth/react";
import BrandLoader from "@/components/BrandLoader";
import Button from "@/components/Button";
import Modal from "@/components/Modal";
import { Badge } from "@/components/ui/badge";
import { hasPermission } from "@/lib/permissions";

interface LocationOption {
  id: number;
  name: string;
  isActive: boolean;
}

interface StockProduct {
  id: number;
  name: string;
  sku: string;
  stock: number;
  isBundle?: boolean;
}

interface TransferItem {
  id: number;
  productId: number;
  name: string;
  sku: string;
  qty: number;
  receivedQty: number | null;
  costPrice: number;
}

interface TransferRow {
  id: number;
  no: string;
  date: string;
  note: string | null;
  status: string;
  sentAt: string | null;
  receivedAt: string | null;
  fromLocation: { id: number; name: string };
  toLocation: { id: number; name: string };
  itemCount: number;
  totalQty: number;
  totalReceived: number;
  items: TransferItem[];
}

interface DraftLine {
  productId: number;
  name: string;
  sku: string;
  available: number;
  qty: number;
}

const today = () => new Date().toISOString().split("T")[0];

export default function StockTransfersPage() {
  const { data: session } = useSession();
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [fromLocationId, setFromLocationId] = useState<number | null>(null);
  const [toLocationId, setToLocationId] = useState<number | null>(null);
  const [date, setDate] = useState(today());
  const [note, setNote] = useState("");
  const [stock, setStock] = useState<StockProduct[]>([]);
  const [loadingStock, setLoadingStock] = useState(false);
  const [search, setSearch] = useState("");
  const [lines, setLines] = useState<DraftLine[]>([]);
  const [transfers, setTransfers] = useState<TransferRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [receiveTarget, setReceiveTarget] = useState<TransferRow | null>(null);
  const [receiveQtys, setReceiveQtys] = useState<Record<number, number>>({});
  const [receiving, setReceiving] = useState(false);
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [error, setError] = useState("");

  const canCancel = hasPermission(
    session?.user?.role,
    session?.user?.permissions,
    "inventoryTransfer",
    "delete"
  );

  const loadLocations = useCallback(async () => {
    const response = await fetch("/api/locations");
    const body = await response.json();
    if (!response.ok) {
      throw new Error(body.error || "Gagal memuat gudang.");
    }
    const rows: LocationOption[] = Array.isArray(body) ? body : [];
    setLocations(rows);
    setFromLocationId((current) => current ?? rows[0]?.id ?? null);
    setToLocationId((current) => {
      if (current !== null) return current;
      const alternative = rows.find((row) => row.id !== rows[0]?.id);
      return alternative?.id ?? null;
    });
  }, []);

  const loadTransfers = useCallback(async () => {
    try {
      const response = await fetch("/api/warehouse/transfers");
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error || "Gagal memuat riwayat transfer.");
      }
      setTransfers(Array.isArray(body) ? body : []);
      setError("");
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Gagal memuat riwayat transfer."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLocations().catch((loadError) =>
      setError(
        loadError instanceof Error ? loadError.message : "Gagal memuat gudang."
      )
    );
    void loadTransfers();
  }, [loadLocations, loadTransfers]);

  useEffect(() => {
    if (fromLocationId === null) {
      setStock([]);
      return;
    }
    let cancelled = false;
    setLoadingStock(true);
    fetch(`/api/warehouse/stock?locationId=${fromLocationId}`)
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) {
          throw new Error(body.error || "Gagal memuat stok gudang asal.");
        }
        if (!cancelled) setStock(Array.isArray(body) ? body : []);
      })
      .catch((loadError) => {
        if (!cancelled) {
          setStock([]);
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Gagal memuat stok gudang asal."
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingStock(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fromLocationId]);

  // Baris yang sudah ditambahkan tidak ditawarkan dua kali.
  const selectedIds = useMemo(
    () => new Set(lines.map((line) => line.productId)),
    [lines]
  );

  const availableProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    return stock
      .filter((product) => !product.isBundle && product.stock > 0)
      .filter(
        (product) =>
          !query ||
          product.name.toLowerCase().includes(query) ||
          product.sku.toLowerCase().includes(query)
      )
      .slice(0, 40);
  }, [search, stock]);

  const addLine = (product: StockProduct) => {
    setLines((current) => {
      if (current.some((line) => line.productId === product.id)) return current;
      return [
        ...current,
        {
          productId: product.id,
          name: product.name,
          sku: product.sku,
          available: product.stock,
          qty: 1,
        },
      ];
    });
  };

  const updateQty = (productId: number, raw: string) => {
    const parsed = Number(raw);
    setLines((current) =>
      current.map((line) =>
        line.productId === productId
          ? {
              ...line,
              qty: Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : 0,
            }
          : line
      )
    );
  };

  const removeLine = (productId: number) => {
    setLines((current) => current.filter((line) => line.productId !== productId));
  };

  const totalQty = lines.reduce((sum, line) => sum + line.qty, 0);

  const submitTransfer = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting) return;
    if (fromLocationId === null || toLocationId === null) {
      await Swal.fire("Gudang belum dipilih", "Pilih gudang asal dan tujuan.", "warning");
      return;
    }
    if (fromLocationId === toLocationId) {
      await Swal.fire(
        "Gudang sama",
        "Gudang asal dan tujuan tidak boleh sama.",
        "warning"
      );
      return;
    }
    if (lines.length === 0) {
      await Swal.fire("Belum ada produk", "Tambahkan minimal satu produk.", "warning");
      return;
    }
    const invalid = lines.find(
      (line) => !Number.isSafeInteger(line.qty) || line.qty <= 0
    );
    if (invalid) {
      await Swal.fire(
        "Qty tidak valid",
        `Qty untuk ${invalid.name} harus lebih dari 0.`,
        "warning"
      );
      return;
    }
    const exceeded = lines.find((line) => line.qty > line.available);
    if (exceeded) {
      await Swal.fire(
        "Stok asal kurang",
        `${exceeded.name}: tersedia ${exceeded.available}, diminta ${exceeded.qty}.`,
        "warning"
      );
      return;
    }

    const confirmed = await Swal.fire({
      title: "Proses transfer stok?",
      text: `${totalQty} unit akan dipindahkan. Stok langsung berkurang di gudang asal.`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Transfer",
      cancelButtonText: "Batal",
      confirmButtonColor: "#1769e0",
    });
    if (!confirmed.isConfirmed) return;

    setSubmitting(true);
    try {
      const response = await fetch("/api/warehouse/transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestKey: crypto.randomUUID(),
          fromLocationId,
          toLocationId,
          date,
          note,
          items: lines.map((line) => ({
            productId: line.productId,
            qty: line.qty,
          })),
        }),
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error || "Gagal membuat transfer.");
      }
      setLines([]);
      setNote("");
      await loadTransfers();
      await loadLocations();
      await Swal.fire(
        "Transfer dikirim",
        `Nomor ${body.no}. Barang berstatus Dalam Perjalanan sampai gudang tujuan menerima.`,
        "success"
      );
    } catch (submitError) {
      await Swal.fire(
        "Transfer gagal",
        submitError instanceof Error ? submitError.message : "Terjadi kesalahan.",
        "error"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const openReceive = (transfer: TransferRow) => {
    setReceiveTarget(transfer);
    setReceiveQtys(
      Object.fromEntries(
        transfer.items.map((item) => [item.id, item.receivedQty ?? item.qty])
      )
    );
  };

  const updateReceiveQty = (itemId: number, raw: string) => {
    const parsed = Number(raw);
    setReceiveQtys((current) => ({
      ...current,
      [itemId]: Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : 0,
    }));
  };

  const receiveTotals = useMemo(() => {
    if (!receiveTarget) return { received: 0, shortage: 0, value: 0 };
    let received = 0;
    let shortage = 0;
    let value = 0;
    for (const item of receiveTarget.items) {
      const qty = receiveQtys[item.id] ?? item.qty;
      received += qty;
      shortage += item.qty - qty;
      value += item.qty * item.costPrice;
    }
    return { received, shortage, value };
  }, [receiveQtys, receiveTarget]);

  const submitReceive = async () => {
    if (!receiveTarget || receiving) return;
    const invalid = receiveTarget.items.find((item) => {
      const qty = receiveQtys[item.id] ?? item.qty;
      return !Number.isSafeInteger(qty) || qty < 0 || qty > item.qty;
    });
    if (invalid) {
      await Swal.fire(
        "Jumlah tidak valid",
        `Jumlah diterima ${invalid.name} harus antara 0 dan ${invalid.qty}.`,
        "warning"
      );
      return;
    }

    const confirmed = await Swal.fire({
      title: "Terima transfer?",
      text:
        receiveTotals.shortage > 0
          ? `${receiveTotals.received} unit diterima, ${receiveTotals.shortage} unit selisih akan dibebankan sebagai selisih stok.`
          : `${receiveTotals.received} unit akan menambah stok gudang tujuan.`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Terima",
      cancelButtonText: "Batal",
      confirmButtonColor: "#1769e0",
    });
    if (!confirmed.isConfirmed) return;

    setReceiving(true);
    try {
      const response = await fetch(
        `/api/warehouse/transfers/${receiveTarget.id}/receive`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: receiveTarget.items.map((item) => ({
              itemId: item.id,
              receivedQty: receiveQtys[item.id] ?? item.qty,
            })),
          }),
        }
      );
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error || "Gagal menerima transfer.");
      }
      setReceiveTarget(null);
      setReceiveQtys({});
      await loadTransfers();
      await Swal.fire(
        "Transfer diterima",
        `Stok gudang tujuan telah diperbarui (${receiveTotals.received} unit).`,
        "success"
      );
    } catch (receiveError) {
      await Swal.fire(
        "Gagal menerima",
        receiveError instanceof Error ? receiveError.message : "Terjadi kesalahan.",
        "error"
      );
    } finally {
      setReceiving(false);
    }
  };

  const cancelTransfer = async (transfer: TransferRow) => {
    if (cancellingId !== null) return;
    const confirmed = await Swal.fire({
      title: "Batalkan transfer?",
      text: `Transfer ${transfer.no} akan dibatalkan dan stok dikembalikan ke gudang asal.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Batalkan Transfer",
      cancelButtonText: "Tutup",
      confirmButtonColor: "#dc2626",
    });
    if (!confirmed.isConfirmed) return;

    setCancellingId(transfer.id);
    try {
      const response = await fetch(`/api/warehouse/transfers/${transfer.id}`, {
        method: "DELETE",
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(body?.error || "Gagal membatalkan transfer.");
      }
      await loadTransfers();
      await Swal.fire(
        "Dibatalkan",
        "Transfer dibatalkan dan stok kembali ke gudang asal.",
        "success"
      );
    } catch (cancelError) {
      await Swal.fire(
        "Gagal membatalkan",
        cancelError instanceof Error ? cancelError.message : "Terjadi kesalahan.",
        "error"
      );
    } finally {
      setCancellingId(null);
    }
  };

  if (loading) return <BrandLoader label="Memuat transfer stok..." />;

  return (
    <div className="mx-auto w-full max-w-screen-2xl space-y-6 px-4 py-8 sm:px-8 xl:px-10">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          <ArrowLeftRight className="h-6 w-6 text-indigo-600" />
          Transfer Stok Antar Gudang
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Pindahkan stok antar gudang dalam dua langkah: kirim dari gudang asal,
          lalu terima di gudang tujuan. Selisih penerimaan dicatat otomatis.
        </p>
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700"
        >
          {error}
        </p>
      )}

      <form
        onSubmit={submitTransfer}
        className="space-y-5 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-6"
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block text-sm font-semibold text-slate-700">
            Gudang asal
            <select
              value={fromLocationId ?? ""}
              onChange={(event) => {
                setFromLocationId(Number(event.target.value));
                setLines([]);
              }}
              className="form-control mt-1.5"
              required
            >
              <option value="" disabled>
                Pilih gudang
              </option>
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-semibold text-slate-700">
            Gudang tujuan
            <select
              value={toLocationId ?? ""}
              onChange={(event) => setToLocationId(Number(event.target.value))}
              className="form-control mt-1.5"
              required
            >
              <option value="" disabled>
                Pilih gudang
              </option>
              {locations
                .filter((location) => location.id !== fromLocationId)
                .map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.name}
                  </option>
                ))}
            </select>
          </label>
          <label className="block text-sm font-semibold text-slate-700">
            Tanggal
            <input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="form-control mt-1.5"
              required
            />
          </label>
          <label className="block text-sm font-semibold text-slate-700">
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
              <p className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                <Warehouse className="h-4 w-4 text-slate-400" />
                Stok gudang asal
              </p>
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
            <div className="max-h-80 overflow-y-auto p-2">
              {loadingStock ? (
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
                      <Badge variant="success">{product.stock}</Badge>
                      <Plus className="h-4 w-4 text-slate-400" />
                    </span>
                  </button>
                ))
              )}
              {!loadingStock && availableProducts.length === 0 && (
                <p className="p-4 text-center text-sm text-slate-500">
                  Tidak ada produk dengan stok di gudang ini.
                </p>
              )}
            </div>
          </section>

          <section className="rounded-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 p-3">
              <p className="text-sm font-semibold text-slate-800">
                Produk akan ditransfer
              </p>
              <Badge variant="info">{totalQty} unit</Badge>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {lines.length === 0 ? (
                <p className="p-6 text-center text-sm text-slate-500">
                  Belum ada produk dipilih.
                </p>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-3 py-2">Produk</th>
                      <th className="px-3 py-2 text-center">Tersedia</th>
                      <th className="px-3 py-2 text-center">Qty</th>
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
                          {line.available}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <input
                            type="number"
                            min={1}
                            max={line.available}
                            value={line.qty}
                            onChange={(event) =>
                              updateQty(line.productId, event.target.value)
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

        <div className="flex justify-end">
          <Button type="submit" disabled={submitting || lines.length === 0}>
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Memproses...
              </>
            ) : (
              <>
                <ArrowLeftRight className="h-4 w-4" />
                Proses Transfer
              </>
            )}
          </Button>
        </div>
      </form>

      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-900">
            Riwayat transfer terakhir
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Nomor</th>
                <th className="px-4 py-3">Tanggal</th>
                <th className="px-4 py-3">Dari</th>
                <th className="px-4 py-3">Ke</th>
                <th className="px-4 py-3 text-right">Item</th>
                <th className="px-4 py-3 text-right">Dikirim</th>
                <th className="px-4 py-3 text-right">Diterima</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transfers.map((transfer) => (
                <tr key={transfer.id} className="hover:bg-slate-50/70">
                  <td className="px-4 py-3 font-mono text-xs text-slate-700">
                    {transfer.no}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {new Date(transfer.date).toLocaleDateString("id-ID")}
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-800">
                    {transfer.fromLocation.name}
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-800">
                    {transfer.toLocation.name}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-600">
                    {transfer.itemCount}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-600">
                    {transfer.totalQty}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-600">
                    {transfer.status === "RECEIVED"
                      ? transfer.totalReceived
                      : "-"}
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      variant={
                        transfer.status === "RECEIVED"
                          ? "success"
                          : transfer.status === "IN_TRANSIT"
                          ? "warning"
                          : transfer.status === "CANCELLED"
                          ? "danger"
                          : "default"
                      }
                      withDot
                    >
                      {transfer.status === "RECEIVED"
                        ? "Diterima"
                        : transfer.status === "IN_TRANSIT"
                        ? "Dalam Perjalanan"
                        : transfer.status === "CANCELLED"
                        ? "Dibatalkan"
                        : transfer.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {transfer.status === "IN_TRANSIT" ? (
                      <div className="flex justify-end gap-1.5">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => openReceive(transfer)}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Terima
                        </Button>
                        {canCancel && (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            disabled={cancellingId === transfer.id}
                            onClick={() => void cancelTransfer(transfer)}
                          >
                            <XCircle className="h-3.5 w-3.5" />
                            Batalkan
                          </Button>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">-</span>
                    )}
                  </td>
                </tr>
              ))}
              {transfers.length === 0 && (
                <tr>
                  <td
                    colSpan={9}
                    className="px-4 py-10 text-center text-sm text-slate-500"
                  >
                    Belum ada transfer stok.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <Modal
        isOpen={receiveTarget !== null}
        onClose={() => {
          setReceiveTarget(null);
          setReceiveQtys({});
        }}
        title={receiveTarget ? `Terima Transfer ${receiveTarget.no}` : "Terima Transfer"}
        description={
          receiveTarget
            ? `${receiveTarget.fromLocation.name} → ${receiveTarget.toLocation.name}`
            : undefined
        }
        maxWidth="max-w-3xl"
      >
        {receiveTarget && (
          <div className="space-y-4">
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-3 py-2">Produk</th>
                    <th className="px-3 py-2">SKU</th>
                    <th className="px-3 py-2 text-center">Dikirim</th>
                    <th className="px-3 py-2 text-center">Diterima</th>
                    <th className="px-3 py-2 text-center">Selisih</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {receiveTarget.items.map((item) => {
                    const qty = receiveQtys[item.id] ?? item.qty;
                    const diff = item.qty - qty;
                    return (
                      <tr key={item.id}>
                        <td className="px-3 py-2 font-medium text-slate-800">
                          {item.name}
                        </td>
                        <td className="px-3 py-2 font-mono text-xs text-slate-500">
                          {item.sku}
                        </td>
                        <td className="px-3 py-2 text-center text-slate-600">
                          {item.qty}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <input
                            type="number"
                            min={0}
                            max={item.qty}
                            value={qty}
                            onChange={(event) =>
                              updateReceiveQty(item.id, event.target.value)
                            }
                            className="w-20 rounded-lg border border-slate-200 px-2 py-1 text-center text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                          />
                        </td>
                        <td
                          className={`px-3 py-2 text-center font-semibold ${
                            diff > 0 ? "text-rose-600" : "text-slate-500"
                          }`}
                        >
                          {diff > 0 ? `−${diff}` : diff < 0 ? `+${Math.abs(diff)}` : "0"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2.5 text-sm">
              <span className="text-slate-600">
                Diterima <b>{receiveTotals.received}</b> unit
              </span>
              {receiveTotals.shortage > 0 ? (
                <Badge variant="warning" withDot>
                  Selisih {receiveTotals.shortage} unit → beban 5-1990
                </Badge>
              ) : (
                <Badge variant="success" withDot>
                  Diterima penuh
                </Badge>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setReceiveTarget(null);
                  setReceiveQtys({});
                }}
              >
                Batal
              </Button>
              <Button
                type="button"
                onClick={() => void submitReceive()}
                disabled={receiving}
              >
                {receiving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                {receiving ? "Memproses..." : "Terima Transfer"}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
