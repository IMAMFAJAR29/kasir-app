"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, MonitorSmartphone, Pencil, Plus } from "lucide-react";
import Swal from "sweetalert2";
import Modal from "@/components/Modal";
import Button from "@/components/Button";
import { Badge } from "@/components/ui/badge";

interface RegisterRow {
  id: number;
  name: string;
  code: string;
  isActive: boolean;
  location: { id: number; name: string };
  warehouse: { id: number; name: string };
  activeSession: {
    id: string;
    cashier: { id: string; name: string; email: string | null };
  } | null;
}

interface Outlet {
  id: number;
  name: string;
  isActive: boolean;
}

interface RegisterManagerProps {
  /** Outlet yang sedang aktif di halaman Lokasi Gudang. */
  outletId: number;
  outlets: Outlet[];
}

const emptyForm = { name: "", code: "", warehouseId: "" };

/**
 * Manajemen mesin kasir per outlet (dipakai dari halaman Lokasi Gudang).
 * Satu mesin = satu outlet + satu gudang stok.
 */
export default function RegisterManager({
  outletId,
  outlets,
}: RegisterManagerProps) {
  const [registers, setRegisters] = useState<RegisterRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<RegisterRow | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const loadRegisters = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/pos-registers?locationId=${outletId}`);
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error || "Gagal memuat mesin kasir.");
      }
      setRegisters(Array.isArray(body) ? body : []);
    } catch (loadError) {
      setRegisters([]);
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Gagal memuat mesin kasir."
      );
    } finally {
      setLoading(false);
    }
  }, [outletId]);

  useEffect(() => {
    void loadRegisters();
  }, [loadRegisters]);

  const activeOutlet = useMemo(
    () => outlets.find((outlet) => outlet.id === outletId),
    [outletId, outlets]
  );

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm, warehouseId: String(outletId) });
    setIsOpen(true);
  };

  const openEdit = (register: RegisterRow) => {
    setEditing(register);
    setForm({
      name: register.name,
      code: register.code,
      warehouseId: String(register.warehouse.id),
    });
    setIsOpen(true);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (saving) return;
    const name = form.name.trim();
    const code = form.code.trim().toUpperCase();
    const warehouseId = Number(form.warehouseId);
    if (!name) {
      await Swal.fire("Nama wajib diisi", "Isi nama mesin kasir.", "warning");
      return;
    }
    if (!code) {
      await Swal.fire("Kode wajib diisi", "Isi kode unik mesin kasir.", "warning");
      return;
    }
    if (!Number.isSafeInteger(warehouseId) || warehouseId <= 0) {
      await Swal.fire("Gudang wajib dipilih", "Pilih gudang stok mesin.", "warning");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(
        editing ? `/api/pos-registers/${editing.id}` : "/api/pos-registers",
        {
          method: editing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            code,
            locationId: outletId,
            warehouseId,
          }),
        }
      );
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error || "Gagal menyimpan mesin kasir.");
      }
      setIsOpen(false);
      setEditing(null);
      await loadRegisters();
      await Swal.fire(
        "Tersimpan",
        `Mesin kasir ${name} berhasil ${editing ? "diperbarui" : "ditambahkan"}.`,
        "success"
      );
    } catch (saveError) {
      await Swal.fire(
        "Gagal menyimpan",
        saveError instanceof Error ? saveError.message : "Terjadi kesalahan.",
        "error"
      );
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (register: RegisterRow) => {
    const nextStatus = !register.isActive;
    const confirmed = await Swal.fire({
      title: nextStatus ? "Aktifkan mesin?" : "Nonaktifkan mesin?",
      text: `${register.name} ${nextStatus ? "dapat" : "tidak dapat"} dipakai untuk membuka kasir.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: nextStatus ? "Aktifkan" : "Nonaktifkan",
      cancelButtonText: "Batal",
    });
    if (!confirmed.isConfirmed) return;
    try {
      const response = await fetch(`/api/pos-registers/${register.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: nextStatus }),
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error || "Gagal mengubah status mesin.");
      }
      await loadRegisters();
    } catch (statusError) {
      await Swal.fire(
        "Gagal mengubah status",
        statusError instanceof Error ? statusError.message : "Terjadi kesalahan.",
        "error"
      );
    }
  };

  return (
    <section className="space-y-3 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
            <MonitorSmartphone className="h-4 w-4 text-indigo-600" />
            Mesin kasir
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            {activeOutlet
              ? `Mesin kasir untuk ${activeOutlet.name}.`
              : "Setiap mesin memakai satu gudang stok."}
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          onClick={openCreate}
          className="shrink-0"
        >
          <Plus className="h-4 w-4" />
          Tambah
        </Button>
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700"
        >
          {error}
        </p>
      )}

      {loading ? (
        <p className="flex items-center gap-2 py-4 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Memuat mesin kasir...
        </p>
      ) : (
        <div className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200">
          {registers.map((register) => (
            <div
              key={register.id}
              className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-slate-900">
                    {register.name}
                  </p>
                  <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-500">
                    {register.code}
                  </span>
                  <Badge
                    variant={
                      !register.isActive
                        ? "default"
                        : register.activeSession
                          ? "warning"
                          : "success"
                    }
                    withDot
                  >
                    {!register.isActive
                      ? "Nonaktif"
                      : register.activeSession
                        ? `Dipakai ${register.activeSession.cashier.name}`
                        : "Tersedia"}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Gudang stok: {register.warehouse.name}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  onClick={() => openEdit(register)}
                  className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => void toggleActive(register)}
                  disabled={Boolean(register.activeSession)}
                  className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                >
                  {register.isActive ? "Nonaktifkan" : "Aktifkan"}
                </button>
              </div>
            </div>
          ))}
          {registers.length === 0 && (
            <p className="px-3 py-6 text-center text-sm text-slate-500">
              Belum ada mesin kasir di outlet ini.
            </p>
          )}
        </div>
      )}

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title={editing ? "Edit mesin kasir" : "Tambah mesin kasir"}
        description="Pilih gudang stok yang menjadi sumber pengurangan stok transaksi."
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block text-sm font-semibold text-slate-700">
            Nama mesin kasir
            <input
              value={form.name}
              onChange={(event) =>
                setForm((current) => ({ ...current, name: event.target.value }))
              }
              placeholder="Contoh: Kasir 1"
              className="form-control mt-1.5"
              required
            />
          </label>
          <label className="block text-sm font-semibold text-slate-700">
            Kode mesin
            <input
              value={form.code}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  code: event.target.value.toUpperCase(),
                }))
              }
              placeholder="Contoh: KSR1"
              maxLength={20}
              className="form-control mt-1.5 font-mono"
              required
            />
          </label>
          <label className="block text-sm font-semibold text-slate-700">
            Gudang stok
            <select
              value={form.warehouseId}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  warehouseId: event.target.value,
                }))
              }
              className="form-control mt-1.5"
              required
            >
              <option value="">Pilih gudang</option>
              {outlets.map((outlet) => (
                <option key={outlet.id} value={outlet.id}>
                  {outlet.name}
                </option>
              ))}
            </select>
          </label>
          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsOpen(false)}
            >
              Batal
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Menyimpan..." : "Simpan"}
            </Button>
          </div>
        </form>
      </Modal>
    </section>
  );
}
