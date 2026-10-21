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
  permissionModules,
  type UserPermissions,
} from "@/lib/permissions";

interface ManagedUser {
  id: string;
  name: string;
  email: string | null;
  nik: string | null;
  role: string;
  permissions: UserPermissions;
  createdAt: string;
  isOwner: boolean;
  isActive: boolean;
}

export default function CashierAccountsPage() {
  const { data: session } = useSession();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nik, setNik] = useState("");
  const [pin, setPin] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [role, setRole] = useState<"CASHIER" | "ADMIN">("CASHIER");
  const [permissions, setPermissions] = useState<UserPermissions>(
    defaultCashierPermissions
  );
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingRole, setEditingRole] = useState<"ADMIN" | "CASHIER">("ADMIN");
  const [editName, setEditName] = useState("");
  const [editNik, setEditNik] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editPermissions, setEditPermissions] = useState<UserPermissions>({});
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
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
        body: JSON.stringify({
          name,
          ...(role === "CASHIER" ? { nik, pin } : { email, password }),
          role,
          permissions,
          isActive,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Gagal membuat pengguna.");
      setName("");
      setEmail("");
      setPassword("");
      setNik("");
      setPin("");
      setIsActive(true);
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

  const resetPin = async (user: ManagedUser) => {
    const { value: newPin } = await Swal.fire({
      title: `Atur ulang PIN ${user.name}`,
      input: "password",
      inputLabel: "PIN baru, 4–12 digit angka",
      inputAttributes: { inputmode: "numeric", maxlength: "12", autocomplete: "new-password" },
      showCancelButton: true,
      confirmButtonText: "Simpan PIN",
      cancelButtonText: "Batal",
      inputValidator: (value) =>
        /^\d{4,12}$/.test(value || "")
          ? undefined
          : "PIN harus terdiri dari 4 sampai 12 digit angka.",
    });
    if (!newPin) return;
    try {
      const response = await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: newPin }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Gagal mengatur ulang PIN.");
      await Swal.fire("PIN diperbarui", "PIN baru tersimpan dengan aman.", "success");
    } catch (resetError) {
      await Swal.fire(
        "Gagal mengatur ulang PIN",
        resetError instanceof Error ? resetError.message : "Terjadi kesalahan.",
        "error"
      );
    }
  };

  const toggleAccountStatus = async (user: ManagedUser) => {
    const nextStatus = !user.isActive;
    const confirmed = await Swal.fire({
      title: nextStatus ? "Aktifkan akun?" : "Nonaktifkan akun?",
      text: `${user.name} ${nextStatus ? "dapat" : "tidak dapat"} login ${nextStatus ? "kembali" : "lagi"} setelah perubahan ini.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: nextStatus ? "Aktifkan" : "Nonaktifkan",
      cancelButtonText: "Batal",
    });
    if (!confirmed.isConfirmed) return;
    try {
      const response = await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: nextStatus }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Gagal mengubah status akun.");
      await loadUsers();
    } catch (statusError) {
      await Swal.fire(
        "Gagal mengubah status",
        statusError instanceof Error ? statusError.message : "Terjadi kesalahan.",
        "error"
      );
    }
  };

  const filteredUsers = users.filter((user) => {
    const query = search.trim().toLocaleLowerCase();
    const matchesSearch =
      !query ||
      user.name.toLocaleLowerCase().includes(query) ||
      (user.nik || "").includes(query) ||
      (user.email || "").toLocaleLowerCase().includes(query);
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && user.isActive) ||
      (statusFilter === "inactive" && !user.isActive);
    return matchesSearch && matchesStatus;
  });

  const savePermissions = async (user: ManagedUser) => {
    setSavingPermissions(true);
    try {
      const response = await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: editingRole,
          name: editName,
          ...(editingRole === "CASHIER" ? { nik: editNik } : {}),
          ...(editingRole === "ADMIN"
            ? {
                email: editEmail,
                ...(editPassword ? { password: editPassword } : {}),
              }
            : {}),
          permissions: editPermissions,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Gagal menyimpan akses.");
      setEditingUserId(null);
      setEditPassword("");
      await loadUsers();
      await Swal.fire("Akun diperbarui", "Profil dan hak akses berhasil disimpan.", "success");
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
          Akun & Hak Akses
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Kelola akun kasir NIK/PIN, administrator, status akun, dan hak akses setiap modul.
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
        {role === "CASHIER" ? (
          <>
            <label className="text-sm font-semibold text-slate-700">
              NIK (6–20 digit)
              <input
                value={nik}
                onChange={(event) => setNik(event.target.value.replace(/\D/g, ""))}
                className="form-control mt-1.5"
                inputMode="numeric"
                maxLength={20}
                required
              />
            </label>
            <label className="text-sm font-semibold text-slate-700">
              PIN (4–12 digit)
              <input
                type="password"
                value={pin}
                onChange={(event) => setPin(event.target.value)}
                className="form-control mt-1.5"
                inputMode="numeric"
                autoComplete="new-password"
                maxLength={12}
                minLength={4}
                required
              />
            </label>
          </>
        ) : (
          <>
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
          </>
        )}
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
        <label className="text-sm font-semibold text-slate-700">
          Status akun
          <select
            value={isActive ? "active" : "inactive"}
            onChange={(event) => setIsActive(event.target.value === "active")}
            className="form-control mt-1.5"
          >
            <option value="active">Aktif</option>
            <option value="inactive">Nonaktif</option>
          </select>
        </label>
        <div className="space-y-2 sm:col-span-2">
            <p className="text-sm font-semibold text-slate-700">
              Hak akses {role === "ADMIN" ? "Administrator" : "Kasir"}
            </p>
            <PermissionsGrid value={permissions} onChange={setPermissions} />
        </div>
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
        <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-semibold text-slate-900">Daftar Akun Pengguna</h2>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              aria-label="Cari nama atau NIK"
              placeholder="Cari nama atau NIK"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="form-control"
            />
            <select
              aria-label="Filter status akun"
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as "all" | "active" | "inactive")
              }
              className="form-control"
            >
              <option value="all">Semua status</option>
              <option value="active">Aktif</option>
              <option value="inactive">Nonaktif</option>
            </select>
          </div>
        </div>
        <div className="divide-y divide-slate-100">
          {filteredUsers.map((user) => {
            const grantedModules = permissionModules
              .filter(({ key }) =>
                Object.values(user.permissions?.[key] || {}).some(Boolean)
              )
              .map(({ label }) => label);
            return (
            <div key={user.id} className="flex flex-col gap-3 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-slate-900">{user.name}</p>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${user.isActive ? "bg-teal-50 text-teal-700" : "bg-slate-100 text-slate-600"}`}>
                    {user.isActive ? "Aktif" : "Nonaktif"}
                  </span>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${user.role === "ADMIN" ? "bg-blue-50 text-blue-700" : "bg-teal-50 text-teal-700"}`}>
                    {user.role === "ADMIN" ? "Administrator" : "Kasir POS"}
                  </span>
                  {user.isOwner && (
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                      Pemilik utama · Terkunci
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {user.role === "CASHIER" ? `NIK: ${user.nik || "Belum diatur"}` : user.email}
                  {" · Dibuat "}
                  {new Date(user.createdAt).toLocaleDateString("id-ID")}
                </p>
                <p className="mt-1 truncate text-xs text-slate-500">
                  Hak akses: {grantedModules.length ? grantedModules.join(", ") : "Tidak ada"}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    void Swal.fire({
                      title: user.name,
                      text: `${user.role === "CASHIER" ? `NIK: ${user.nik || "Belum diatur"}` : `Email: ${user.email || "-"}`} · ${user.isActive ? "Aktif" : "Nonaktif"} · Hak akses: ${grantedModules.join(", ") || "Tidak ada"}`,
                      confirmButtonText: "Tutup",
                    })
                  }
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Detail
                </button>
                {canUpdateUsers && !user.isOwner && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        const nextRole = user.role === "CASHIER" ? "CASHIER" : "ADMIN";
                        setEditingUserId(user.id);
                        setEditingRole(nextRole);
                        setEditName(user.name);
                        setEditNik(user.nik || "");
                        setEditEmail(user.email || "");
                        setEditPassword("");
                        setEditPermissions(
                          Object.keys(user.permissions || {}).length
                            ? { ...createEmptyPermissions(), ...user.permissions }
                            : nextRole === "CASHIER"
                              ? defaultCashierPermissions
                              : defaultAdministratorPermissions
                        );
                      }}
                      className="rounded-lg border border-blue-200 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50"
                    >
                      Edit akun
                    </button>
                    {user.role === "CASHIER" && (
                      <button
                        type="button"
                        onClick={() => void resetPin(user)}
                        className="rounded-lg border border-amber-200 px-3 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-50"
                      >
                        Atur ulang PIN
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => void toggleAccountStatus(user)}
                      disabled={user.id === session?.user?.id}
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    >
                      {user.isActive ? "Nonaktifkan" : "Aktifkan"}
                    </button>
                  </>
                )}
                {canDeleteUsers && !user.isOwner && user.id !== session?.user?.id && (
                  <button
                    type="button"
                    onClick={() => void deleteUser(user)}
                    className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                  >
                    Hapus
                  </button>
                )}
              </div>
            </div>
            );
          })}
          {filteredUsers.length === 0 && (
            <p className="px-5 py-8 text-center text-sm text-slate-500">
              Tidak ada akun yang cocok dengan pencarian atau filter.
            </p>
          )}
        </div>
      </div>

      {editingUserId && (
        <section className="space-y-4 rounded-2xl border border-blue-200 bg-white p-5 shadow-sm">
          <div>
            <h2 className="font-semibold text-brand-navy">Edit akun dan hak akses</h2>
            <p className="mt-1 text-sm text-slate-500">
              Pilih peran, lalu tentukan modul dan tindakan yang diizinkan.
            </p>
          </div>
          <label className="block max-w-sm text-sm font-semibold text-slate-700">
            Nama lengkap
            <input
              value={editName}
              onChange={(event) => setEditName(event.target.value)}
              className="form-control mt-1.5"
              required
            />
          </label>
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
          {editingRole === "CASHIER" && (
            <label className="block max-w-sm text-sm font-semibold text-slate-700">
              NIK
              <input
                value={editNik}
                onChange={(event) => setEditNik(event.target.value.replace(/\D/g, ""))}
                className="form-control mt-1.5"
                inputMode="numeric"
                maxLength={20}
                required
              />
            </label>
          )}
          {editingRole === "ADMIN" && (
            <>
              <label className="block max-w-sm text-sm font-semibold text-slate-700">
                Email login
                <input
                  type="email"
                  value={editEmail}
                  onChange={(event) => setEditEmail(event.target.value)}
                  className="form-control mt-1.5"
                  required
                />
              </label>
              <label className="block max-w-sm text-sm font-semibold text-slate-700">
                {users.find((user) => user.id === editingUserId)?.email
                  ? "Password baru (opsional)"
                  : "Password baru (minimal 6 karakter)"}
                <input
                  type="password"
                  value={editPassword}
                  onChange={(event) => setEditPassword(event.target.value)}
                  className="form-control mt-1.5"
                  autoComplete="new-password"
                  minLength={6}
                  required={!users.find((user) => user.id === editingUserId)?.email}
                />
              </label>
            </>
          )}
          <div className="space-y-2">
            <p className="text-sm font-semibold text-slate-700">
              Hak akses {editingRole === "ADMIN" ? "Administrator" : "Kasir"}
            </p>
            <PermissionsGrid value={editPermissions} onChange={setEditPermissions} />
          </div>
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
