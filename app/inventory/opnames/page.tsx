"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ClipboardList,
  Loader2,
  Search,
  Send,
  Trash2,
  XCircle,
} from "lucide-react";
import Swal from "sweetalert2";
import { useSession } from "next-auth/react";
import BrandLoader from "@/components/BrandLoader";
import Button from "@/components/Button";
import Modal from "@/components/Modal";
import { Badge } from "@/components/ui/badge";
import OpnameFormModal from "@/components/inventory/OpnameFormModal";
import { hasPermission } from "@/lib/permissions";

interface LocationOption {
  id: number;
  name: string;
}

interface OpnameItem {
  id: number;
  productId: number;
  name: string;
  sku: string;
  systemQty: number;
  countedQty: number;
  difference: number;
}

interface OpnameRow {
  id: number;
  no: string;
  status: string;
  note: string | null;
  rejectionNote: string | null;
  location: { id: number; name: string };
  createdBy: string;
  createdByName: string | null;
  submittedByName: string | null;
  approvedByName: string | null;
  approvedAt: string | null;
  postedAt: string | null;
  createdAt: string;
  itemCount: number;
  increase: number;
  decrease: number;
  net: number;
  items: OpnameItem[];
}

const STATUS_META: Record<
  string,
  { label: string; variant: "default" | "success" | "warning" | "danger" }
> = {
  DRAFT: { label: "Draft", variant: "default" },
  PENDING: { label: "Menunggu Approval", variant: "warning" },
  APPROVED: { label: "Disetujui", variant: "success" },
  REJECTED: { label: "Ditolak", variant: "danger" },
};

const formatDateTime = (value: string | null) =>
  value
    ? new Date(value).toLocaleString("id-ID", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "-";

export default function StockOpnamePage() {
  const { data: session } = useSession();
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [rows, setRows] = useState<OpnameRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<OpnameRow | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [busy, setBusy] = useState(false);

  const canCreate = hasPermission(
    session?.user?.role,
    session?.user?.permissions,
    "inventoryOpname",
    "create"
  );
  const canUpdate = hasPermission(
    session?.user?.role,
    session?.user?.permissions,
    "inventoryOpname",
    "update"
  );
  const canApprove = hasPermission(
    session?.user?.role,
    session?.user?.permissions,
    "inventoryOpname",
    "approve"
  );
  const canDelete = hasPermission(
    session?.user?.role,
    session?.user?.permissions,
    "inventoryOpname",
    "delete"
  );

  useEffect(() => {
    fetch("/api/locations")
      .then((response) => response.json())
      .then((data) => setLocations(Array.isArray(data) ? data : []))
      .catch(() => setLocations([]));
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search), 400);
    return () => window.clearTimeout(timer);
  }, [search]);

  const loadOpnames = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (locationFilter !== "all") params.set("locationId", locationFilter);
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (debouncedSearch.trim()) params.set("q", debouncedSearch.trim());

      const response = await fetch(
        `/api/inventory/opnames?${params.toString()}`
      );
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error || "Gagal memuat stock opname.");
      }
      setRows(Array.isArray(body) ? body : []);
    } catch (loadError) {
      setRows([]);
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Gagal memuat stock opname."
      );
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, locationFilter, statusFilter]);

  useEffect(() => {
    void loadOpnames();
  }, [loadOpnames]);

  const summary = useMemo(() => {
    return rows.reduce(
      (acc, row) => ({
        total: acc.total + 1,
        draft: acc.draft + (row.status === "DRAFT" ? 1 : 0),
        pending: acc.pending + (row.status === "PENDING" ? 1 : 0),
        approved: acc.approved + (row.status === "APPROVED" ? 1 : 0),
      }),
      { total: 0, draft: 0, pending: 0, approved: 0 }
    );
  }, [rows]);

  const runAction = async (
    opname: OpnameRow,
    action: "submit" | "approve" | "reject",
    rejectionNote?: string
  ) => {
    if (busy) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/inventory/opnames/${opname.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          ...(rejectionNote ? { note: rejectionNote } : {}),
        }),
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error || "Gagal memproses opname.");
      }
      setSelected(body);
      await loadOpnames();
      await Swal.fire(
        "Berhasil",
        action === "approve"
          ? "Opname disetujui dan stok telah disesuaikan."
          : action === "reject"
          ? "Opname ditolak."
          : "Opname diajukan untuk approval.",
        "success"
      );
    } catch (actionError) {
      await Swal.fire(
        "Gagal",
        actionError instanceof Error ? actionError.message : "Terjadi kesalahan.",
        "error"
      );
    } finally {
      setBusy(false);
    }
  };

  const confirmSubmit = async (opname: OpnameRow) => {
    const result = await Swal.fire({
      title: "Ajukan approval?",
      text: "Draft akan dikirim ke approver. Stok belum berubah sampai disetujui.",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Ajukan",
      cancelButtonText: "Batal",
    });
    if (result.isConfirmed) await runAction(opname, "submit");
  };

  const confirmApprove = async (opname: OpnameRow) => {
    const result = await Swal.fire({
      title: "Setujui opname?",
      text: "Stok sistem akan disesuaikan ke jumlah fisik dan jurnal dibuat.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Setujui",
      cancelButtonText: "Batal",
      confirmButtonColor: "#059669",
    });
    if (result.isConfirmed) await runAction(opname, "approve");
  };

  const confirmReject = async (opname: OpnameRow) => {
    const result = await Swal.fire({
      title: "Tolak opname?",
      input: "textarea",
      inputLabel: "Alasan penolakan",
      inputPlaceholder: "Contoh: hasil hitung perlu diulang",
      inputAttributes: { rows: "3" },
      showCancelButton: true,
      confirmButtonText: "Tolak",
      cancelButtonText: "Batal",
      confirmButtonColor: "#dc2626",
      inputValidator: (value) =>
        value && value.trim() ? undefined : "Alasan penolakan wajib diisi.",
    });
    if (result.isConfirmed) {
      await runAction(opname, "reject", String(result.value || "").trim());
    }
  };

  const confirmDelete = async (opname: OpnameRow) => {
    const result = await Swal.fire({
      title: "Hapus draft opname?",
      text: `Draft ${opname.no} akan dihapus permanen. Stok tidak berubah.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Hapus",
      cancelButtonText: "Batal",
      confirmButtonColor: "#dc2626",
    });
    if (!result.isConfirmed || busy) return;

    setBusy(true);
    try {
      const response = await fetch(`/api/inventory/opnames/${opname.id}`, {
        method: "DELETE",
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(body?.error || "Gagal menghapus draft opname.");
      }
      setSelected(null);
      await loadOpnames();
      await Swal.fire("Terhapus", "Draft opname berhasil dihapus.", "success");
    } catch (deleteError) {
      await Swal.fire(
        "Gagal menghapus",
        deleteError instanceof Error ? deleteError.message : "Terjadi kesalahan.",
        "error"
      );
    } finally {
      setBusy(false);
    }
  };

  if (loading && rows.length === 0) {
    return <BrandLoader label="Memuat stock opname..." />;
  }

  const selectedIsCreator = selected?.createdBy === session?.user?.id;
  const canEditSelected =
    selected?.status === "DRAFT" &&
    (canUpdate || (selectedIsCreator && canCreate));
  const canDecideSelected =
    selected?.status === "PENDING" && canApprove && !selectedIsCreator;

  return (
    <div className="mx-auto w-full max-w-screen-2xl space-y-6 px-4 py-8 sm:px-8 xl:px-10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            href="/inventory"
            className="mb-2 inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 transition hover:text-slate-800"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Kembali ke Ringkasan
          </Link>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            <ClipboardList className="h-6 w-6 text-indigo-600" />
            Stock Opname
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Sesi penghitungan fisik dengan draft dan approval. Stok baru berubah
            setelah disetujui.
          </p>
        </div>
        {canCreate && (
          <Button type="button" onClick={() => setShowCreate(true)}>
            <ClipboardList className="h-4 w-4" />
            Buat Opname
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Total Sesi", value: summary.total, tone: "text-slate-900" },
          { label: "Draft", value: summary.draft, tone: "text-slate-600" },
          { label: "Menunggu", value: summary.pending, tone: "text-amber-600" },
          { label: "Disetujui", value: summary.approved, tone: "text-emerald-600" },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs"
          >
            <p className="text-xs font-medium text-slate-500">{card.label}</p>
            <p className={`mt-1 text-xl font-bold ${card.tone}`}>{card.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs md:grid-cols-3">
        <label className="text-xs font-semibold text-slate-600">
          Gudang
          <select
            value={locationFilter}
            onChange={(event) => setLocationFilter(event.target.value)}
            className="form-control mt-1.5"
          >
            <option value="all">Semua gudang</option>
            {locations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-semibold text-slate-600">
          Status
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="form-control mt-1.5"
          >
            <option value="all">Semua status</option>
            <option value="DRAFT">Draft</option>
            <option value="PENDING">Menunggu Approval</option>
            <option value="APPROVED">Disetujui</option>
            <option value="REJECTED">Ditolak</option>
          </select>
        </label>
        <label className="text-xs font-semibold text-slate-600">
          Pencarian
          <div className="relative mt-1.5">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Nomor, catatan, produk, SKU"
              className="form-control w-full pl-9"
            />
          </div>
        </label>
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700"
        >
          {error}
        </p>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Nomor</th>
                <th className="px-4 py-3">Tanggal</th>
                <th className="px-4 py-3">Gudang</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Dibuat</th>
                <th className="px-4 py-3 text-right">Item</th>
                <th className="px-4 py-3 text-right">Net</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => {
                const meta = STATUS_META[row.status] ?? {
                  label: row.status,
                  variant: "default" as const,
                };
                return (
                  <tr key={row.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3 font-mono text-xs text-slate-700">
                      {row.no}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {formatDateTime(row.createdAt)}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {row.location.name}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={meta.variant} withDot>
                        {meta.label}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {row.createdByName || "-"}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">
                      {row.itemCount}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={`font-semibold ${
                          row.net > 0
                            ? "text-emerald-700"
                            : row.net < 0
                            ? "text-rose-700"
                            : "text-slate-500"
                        }`}
                      >
                        {row.net > 0 ? `+${row.net}` : row.net}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setSelected(row)}
                        className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        Detail
                      </button>
                    </td>
                  </tr>
                );
              })}
              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-sm text-slate-500">
                    Belum ada sesi opname pada filter ini.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <OpnameFormModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        onSuccess={() => void loadOpnames()}
        locations={locations}
      />

      <Modal
        isOpen={selected !== null}
        onClose={() => setSelected(null)}
        title={selected ? `Opname ${selected.no}` : "Detail Opname"}
        description={
          selected
            ? `${selected.location.name} · dibuat oleh ${selected.createdByName || "-"}`
            : undefined
        }
        maxWidth="max-w-3xl"
      >
        {selected && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant={(STATUS_META[selected.status] ?? { variant: "default" as const }).variant}
                withDot
              >
                {(STATUS_META[selected.status] ?? { label: selected.status }).label}
              </Badge>
              <Badge variant="success">Masuk +{selected.increase}</Badge>
              <Badge variant="danger">Keluar −{selected.decrease}</Badge>
              <Badge variant="info">
                Net {selected.net > 0 ? `+${selected.net}` : selected.net}
              </Badge>
            </div>

            {selected.note && (
              <p className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600">
                <span className="font-semibold text-slate-700">Catatan: </span>
                {selected.note}
              </p>
            )}
            {selected.rejectionNote && (
              <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                <span className="font-semibold">Alasan ditolak: </span>
                {selected.rejectionNote}
              </p>
            )}

            <div className="grid gap-2 text-xs text-slate-500 sm:grid-cols-3">
              <p>
                Diajukan: <span className="font-medium text-slate-700">{selected.submittedByName || "-"}</span>
              </p>
              <p>
                Diputuskan: <span className="font-medium text-slate-700">{selected.approvedByName || "-"}</span>
              </p>
              <p>
                Waktu: <span className="font-medium text-slate-700">{formatDateTime(selected.approvedAt)}</span>
              </p>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-3 py-2">Produk</th>
                    <th className="px-3 py-2">SKU</th>
                    <th className="px-3 py-2 text-center">Sistem</th>
                    <th className="px-3 py-2 text-center">Fisik</th>
                    <th className="px-3 py-2 text-center">Selisih</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selected.items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-3 py-2 font-medium text-slate-800">
                        {item.name}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs text-slate-500">
                        {item.sku}
                      </td>
                      <td className="px-3 py-2 text-center text-slate-600">
                        {item.systemQty}
                      </td>
                      <td className="px-3 py-2 text-center font-semibold text-slate-800">
                        {item.countedQty}
                      </td>
                      <td
                        className={`px-3 py-2 text-center font-bold ${
                          item.difference > 0
                            ? "text-emerald-600"
                            : item.difference < 0
                            ? "text-rose-600"
                            : "text-slate-500"
                        }`}
                      >
                        {item.difference > 0 ? `+${item.difference}` : item.difference}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap justify-end gap-2">
              {canEditSelected && (
                <Button
                  type="button"
                  variant="secondary"
                  disabled={busy}
                  onClick={() => void confirmSubmit(selected)}
                >
                  <Send className="h-4 w-4" />
                  Ajukan Approval
                </Button>
              )}
              {selected.status === "DRAFT" && canDelete && (
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy}
                  onClick={() => void confirmDelete(selected)}
                >
                  <Trash2 className="h-4 w-4" />
                  Hapus Draft
                </Button>
              )}
              {canDecideSelected && (
                <>
                  <Button
                    type="button"
                    variant="danger"
                    disabled={busy}
                    onClick={() => void confirmReject(selected)}
                  >
                    <XCircle className="h-4 w-4" />
                    Tolak
                  </Button>
                  <Button
                    type="button"
                    variant="success"
                    disabled={busy}
                    onClick={() => void confirmApprove(selected)}
                  >
                    {busy ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" />
                    )}
                    Setujui
                  </Button>
                </>
              )}
              <Button
                type="button"
                variant="outline"
                onClick={() => setSelected(null)}
              >
                Tutup
              </Button>
            </div>

            {selected.status === "PENDING" && !canApprove && (
              <p className="flex items-center gap-1.5 text-xs text-slate-500">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                Menunggu pengguna dengan izin Setujui (inventory.approve).
              </p>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
