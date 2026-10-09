"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Swal from "sweetalert2";
import { useSession } from "next-auth/react";
import BrandLoader from "@/components/BrandLoader";
import PermissionsGrid from "@/components/admin/PermissionsGrid";
import {
  createEmptyPermissions,
  defaultAdministratorPermissions,
  defaultCashierPermissions,
  hasPermission,
  type UserPermissions,
} from "@/lib/permissions";

interface ManagedUser {
  id: string;
  name: string;
  email: string;
  role: string;
  permissions: UserPermissions;
  createdAt: string;
  isOwner: boolean;
}

export default function CashierAccountsPage() {
  const { data: session } = useSession();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"CASHIER" | "ADMIN">("CASHIER");
  const [permissions, setPermissions] = useState<UserPermissions>(
    defaultCashierPermissions
  );
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingRole, setEditingRole] = useState<"ADMIN" | "CASHIER">("ADMIN");
  const [editPermissions, setEditPermissions] = useState<UserPermissions>({});
  const [savingPermissions, setSavingPermissions] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const canCreateUsers = hasPermission(
    session?.user?.role,
    session?.user?.permissions,
    "systemSettings",
    "create"
  ) || users.some((user) => user.id === session?.user?.id && user.isOwner);
  const canUpdateUsers = hasPermission(
    session?.user?.role,
    session?.user?.permissions,
    "systemSettings",
    "update"
  ) || users.some((user) => user.id === session?.user?.id && user.isOwner);
  const canDeleteUsers = hasPermission(
    session?.user?.role,
    session?.user?.permissions,
    "systemSettings",
    "delete"
  ) || users.some((user) => user.id === session?.user?.id && user.isOwner);

  const loadUsers = useCallback(async () => {
    try {
      const response = await fetch("/api/users");
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Gagal memuat akun.");
      setUsers(result);
      setError("");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Gagal memuat akun.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const createCashier = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, role, permissions }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Gagal membuat pengguna.");
      setName("");
      setEmail("");
      setPassword("");
      setRole("CASHIER");
      setPermissions(defaultCashierPermissions);
      await loadUsers();
      await Swal.fire(
        role === "ADMIN" ? "Administrator dibuat" : "Pengguna Kasir POS dibuat",
        role === "ADMIN"
          ? "Hak akses Administrator mengikuti izin modul yang dipilih."
          : "Pengguna dapat mengakses fitur Kasir POS.",
        "success"
      );
    } catch (createError) {
      await Swal.fire(
        "Gagal membuat akun",
        createError instanceof Error ? createError.message : "Terjadi kesalahan.",
        "error"
      );
    } finally {
      setSaving(false);
    }
  };

  const savePermissions = async (user: ManagedUser) => {
    setSavingPermissions(true);
    try {
      const response = await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: editingRole,
          permissions: editPermissions,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Gagal menyimpan akses.");
      setEditingUserId(null);
      await loadUsers();
      await Swal.fire("Hak akses diperbarui", "Izin modul berhasil disimpan.", "success");
    } catch (saveError) {
      await Swal.fire(
        "Gagal menyimpan hak akses",
        saveError instanceof Error ? saveError.message : "Terjadi kesalahan.",
        "error"
      );
    } finally {
      setSavingPermissions(false);
    }
  };

  const deleteUser = async (user: ManagedUser) => {
    const confirmation = await Swal.fire({
      title: "Hapus pengguna ini?",
      text: `Akses login dan email ${user.email} akan dihapus. Riwayat transaksi dan shift tetap tersimpan.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Ya, hapus pengguna",
      cancelButtonText: "Batal",
      confirmButtonColor: "#dc2626",
    });
    if (!confirmation.isConfirmed) return;

    try {
      const response = await fetch(`/api/users/${user.id}`, {
        method: "DELETE",
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Gagal menghapus pengguna.");
      await loadUsers();
      await Swal.fire(
        "Pengguna dihapus",
        "Email dan akses login dihapus. Riwayat transaksi tetap tersimpan.",
        "success"
      );
    } catch (deleteError) {
      await Swal.fire(
        "Gagal menghapus pengguna",
        deleteError instanceof Error ? deleteError.message : "Terjadi kesalahan.",
        "error"
      );
    }
  };

  if (loading) return <BrandLoader label="Memuat akun pengguna..." />;

  return (
    <div className="mx-auto max-w-5xl space-y-5 px-4 py-6 sm:px-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-brand-navy">
          Pengguna
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Buat pengguna Administrator atau Kasir POS dan atur akses modulnya.
        </p>
      </div>

      {error && (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {error}
          <button onClick={() => void loadUsers()} className="ml-3 font-semibold underline">
            Coba lagi
          </button>
        </div>
      )}

      {canCreateUsers && <form onSubmit={createCashier} className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-2">
        <label className="text-sm font-semibold text-slate-700">
          Nama pengguna
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="form-control mt-1.5"
            autoComplete="name"
            required
          />
        </label>
        <label className="text-sm font-semibold text-slate-700">
          Email login
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="form-control mt-1.5"
            autoComplete="email"
            required
          />
        </label>
        <label className="text-sm font-semibold text-slate-700">
          Password (minimal 6 karakter)
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="form-control mt-1.5"
            autoComplete="new-password"
            minLength={6}
            required
          />
        </label>
        <label className="text-sm font-semibold text-slate-700">
          Peran pengguna
          <select
            value={role}
            onChange={(event) => {
              const nextRole = event.target.value === "ADMIN" ? "ADMIN" : "CASHIER";
              setRole(nextRole);
              setPermissions(
                nextRole === "ADMIN"
                  ? {
                      ...createEmptyPermissions(),
                      ...defaultAdministratorPermissions,
                    }
                  : defaultCashierPermissions
              );
            }}
            className="form-control mt-1.5"
          >
            <option value="ADMIN">Administrator (akses sesuai pilihan)</option>
            <option value="CASHIER">Kasir POS</option>
          </select>
        </label>
        {role === "ADMIN" && (
          <div className="space-y-2 sm:col-span-2">
            <p className="text-sm font-semibold text-slate-700">
              Hak akses Administrator
            </p>
            <PermissionsGrid value={permissions} onChange={setPermissions} />
          </div>
        )}
        <div className="flex items-end">
          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 sm:w-auto"
          >
            {saving ? "Membuat pengguna..." : "Buat Pengguna"}
          </button>
        </div>
      </form>}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="font-semibold text-slate-900">Daftar Pengguna</h2>
        </div>
        <div className="divide-y divide-slate-100">
          {users.map((user) => (
            <div key={user.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
              <div>
                <p className="text-sm font-semibold text-slate-900">{user.name}</p>
                <p className="mt-0.5 text-xs text-slate-500">{user.email}</p>
              </div>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                  user.role === "ADMIN"
                    ? "bg-blue-50 text-blue-700"
                    : "bg-teal-50 text-teal-700"
                }`}
              >
                {user.role === "ADMIN"
                  ? "Administrator"
                  : user.role === "CASHIER"
                    ? "Kasir POS"
                    : "Administrator"}
              </span>
              {user.isOwner && (
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                  Pemilik utama · Terkunci
                </span>
              )}
              {canUpdateUsers && !user.isOwner && <button
                type="button"
                onClick={() => {
                  const nextRole = user.role === "CASHIER" ? "CASHIER" : "ADMIN";
                  setEditingUserId(user.id);
                  setEditingRole(nextRole);
                  setEditPermissions(
                    Object.keys(user.permissions || {}).length
                      ? {
                          ...createEmptyPermissions(),
                          ...user.permissions,
                        }
                      : nextRole === "CASHIER"
                        ? defaultCashierPermissions
                        : defaultAdministratorPermissions
                  );
                }}
                className="rounded-lg border border-blue-200 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50"
              >
                Atur Peran & Akses
              </button>}
              {canDeleteUsers && !user.isOwner && user.id !== session?.user?.id && (
                <button
                  type="button"
                  onClick={() => void deleteUser(user)}
                  className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                >
                  Hapus Pengguna
                </button>
              )}
            </div>
          ))}
          {users.length === 0 && (
            <p className="px-5 py-8 text-center text-sm text-slate-500">
              Belum ada pengguna.
            </p>
          )}
        </div>
      </div>

      {editingUserId && (
        <section className="space-y-4 rounded-2xl border border-blue-200 bg-white p-5 shadow-sm">
          <div>
            <h2 className="font-semibold text-brand-navy">Atur hak akses</h2>
            <p className="mt-1 text-sm text-slate-500">
              Pilih peran, lalu tentukan modul dan tindakan yang diizinkan.
            </p>
          </div>
          <label className="block max-w-sm text-sm font-semibold text-slate-700">
            Peran pengguna
            <select
              value={editingRole}
              onChange={(event) => {
                const nextRole = event.target.value === "CASHIER" ? "CASHIER" : "ADMIN";
                setEditingRole(nextRole);
                setEditPermissions(
                  nextRole === "CASHIER"
                    ? defaultCashierPermissions
                    : {
                        ...createEmptyPermissions(),
                        ...defaultAdministratorPermissions,
                      }
                );
              }}
              className="form-control mt-1.5"
            >
              <option value="ADMIN">Administrator</option>
              <option value="CASHIER">Kasir POS</option>
            </select>
          </label>
          {editingRole === "ADMIN" && (
            <PermissionsGrid
              value={editPermissions}
              onChange={setEditPermissions}
            />
          )}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setEditingUserId(null)}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Batal
            </button>
            <button
              type="button"
              disabled={savingPermissions}
              onClick={() => {
                const user = users.find((item) => item.id === editingUserId);
                if (user) void savePermissions(user);
              }}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {savingPermissions ? "Menyimpan..." : "Simpan Hak Akses"}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
