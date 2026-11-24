"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Swal from "sweetalert2";
import { useSession } from "next-auth/react";
import BrandLoader from "@/components/BrandLoader";
import Modal from "@/components/Modal";
import Button from "@/components/Button";
import PermissionsGrid from "@/components/admin/PermissionsGrid";
import UserBulkToolbar from "@/components/admin/UserBulkToolbar";
import { Badge } from "@/components/ui/badge";
import {
  createEmptyPermissions,
  defaultAdministratorPermissions,
  defaultCashierPermissions,
  hasPermission,
  permissionActions,
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
  locationIds?: number[];
}

interface OutletOption {
  id: number;
  name: string;
  isActive: boolean;
}

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

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
  const [editStatus, setEditStatus] = useState(true);
  const [editPermissions, setEditPermissions] = useState<UserPermissions>({});
  const [outlets, setOutlets] = useState<OutletOption[]>([]);
  const [locationIds, setLocationIds] = useState<number[]>([]);
  const [editLocationIds, setEditLocationIds] = useState<number[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [savingPermissions, setSavingPermissions] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [detailUser, setDetailUser] = useState<ManagedUser | null>(null);
  const [error, setError] = useState("");

  const canCreateUsers =
    hasPermission(
      session?.user?.role,
      session?.user?.permissions,
      "systemSettings",
      "create"
    ) || users.some((user) => user.id === session?.user?.id && user.isOwner);
  const canUpdateUsers =
    hasPermission(
      session?.user?.role,
      session?.user?.permissions,
      "systemSettings",
      "update"
    ) || users.some((user) => user.id === session?.user?.id && user.isOwner);
  const canDeleteUsers =
    hasPermission(
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

  useEffect(() => {
    fetch("/api/locations")
      .then((response) => response.json())
      .then((data) => setOutlets(Array.isArray(data) ? data : []))
      .catch(() => setOutlets([]));
  }, []);

  useEffect(() => {
    setSelectedIds((current) => {
      const next = current.filter((id) =>
        users.some((user) => user.id === id)
      );
      return next.length === current.length ? current : next;
    });
  }, [users]);

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
          ...(role === "CASHIER" ? { locationIds } : {}),
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
      setLocationIds([]);
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
      inputLabel: "PIN baru, 6–12 digit angka",
      inputAttributes: {
        inputmode: "numeric",
        maxlength: "12",
        autocomplete: "new-password",
      },
      showCancelButton: true,
      confirmButtonText: "Simpan PIN",
      cancelButtonText: "Batal",
      inputValidator: (value) =>
        /^\d{6,12}$/.test(value || "")
          ? undefined
          : "PIN harus terdiri dari 6 sampai 12 digit angka.",
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

  const selectedUsers = users.filter((user) => selectedIds.includes(user.id));
  const allFilteredSelected =
    filteredUsers.length > 0 &&
    filteredUsers.every((user) => selectedIds.includes(user.id));
  const someFilteredSelected =
    !allFilteredSelected &&
    filteredUsers.some((user) => selectedIds.includes(user.id));

  const toggleSelect = (id: string) => {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : [...current, id]
    );
  };

  const toggleSelectAll = () => {
    const ids = filteredUsers.map((user) => user.id);
    setSelectedIds((current) => {
      if (allFilteredSelected) {
        return current.filter((id) => !ids.includes(id));
      }
      return Array.from(new Set([...current, ...ids]));
    });
  };

  const requireSingleSelected = async (
    label: string
  ): Promise<ManagedUser | null> => {
    if (selectedUsers.length !== 1) {
      await Swal.fire(
        "Pilih satu pengguna",
        `${label} hanya dapat dijalankan untuk satu pengguna.`,
        "info"
      );
      return null;
    }
    return selectedUsers[0];
  };

  const openEditUser = async (user: ManagedUser) => {
    if (!canUpdateUsers) {
      await Swal.fire("Akses ditolak", "Anda tidak dapat mengubah akun.", "error");
      return;
    }
    if (user.isOwner) {
      await Swal.fire(
        "Pemilik utama",
        "Akun pemilik utama tidak dapat diedit dari menu ini.",
        "info"
      );
      return;
    }
    const nextRole: "ADMIN" | "CASHIER" =
      user.role === "CASHIER" ? "CASHIER" : "ADMIN";
    setEditingUserId(user.id);
    setEditingRole(nextRole);
    setEditName(user.name);
    setEditNik(user.nik || "");
    setEditEmail(user.email || "");
    setEditPassword("");
    setEditStatus(user.isActive);
    setEditLocationIds(user.locationIds ?? []);
    setEditPermissions(
      Object.keys(user.permissions || {}).length
        ? { ...createEmptyPermissions(), ...user.permissions }
        : nextRole === "CASHIER"
          ? defaultCashierPermissions
          : defaultAdministratorPermissions
    );
  };

  const savePermissions = async (user: ManagedUser) => {
    setSavingPermissions(true);
    try {
      const response = await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: editingRole,
          name: editName,
          isActive: editStatus,
          ...(editingRole === "CASHIER" ? { nik: editNik } : {}),
          ...(editingRole === "ADMIN"
            ? {
                email: editEmail,
                ...(editPassword ? { password: editPassword } : {}),
              }
            : {}),
          permissions: editPermissions,
          ...(editingRole === "CASHIER" ? { locationIds: editLocationIds } : {}),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Gagal menyimpan akses.");
      setEditingUserId(null);
      setEditPassword("");
      await loadUsers();
      await Swal.fire(
        "Akun diperbarui",
        "Profil dan hak akses berhasil disimpan.",
        "success"
      );
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

  const deleteUserRequest = async (
    user: ManagedUser
  ): Promise<{ ok: boolean; error?: string }> => {
    try {
      const response = await fetch(`/api/users/${user.id}`, {
        method: "DELETE",
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        return { ok: false, error: result?.error || "Gagal menghapus pengguna." };
      }
      return { ok: true };
    } catch {
      return { ok: false, error: "Gagal menghapus pengguna." };
    }
  };

  const handleDeleteSelected = async () => {
    if (bulkDeleting) return;
    if (!canDeleteUsers) {
      await Swal.fire("Akses ditolak", "Anda tidak dapat menghapus akun.", "error");
      return;
    }

    const candidates = selectedUsers.filter(
      (user) => !user.isOwner && user.id !== session?.user?.id
    );
    if (candidates.length === 0) {
      await Swal.fire(
        "Tidak dapat dihapus",
        "Pemilik utama dan akun yang sedang digunakan tidak dapat dihapus.",
        "info"
      );
      return;
    }

    const skipped = selectedUsers.length - candidates.length;
    const preview = candidates
      .slice(0, 5)
      .map((user) => `• ${escapeHtml(user.name)}`)
      .join("<br/>");
    const more =
      candidates.length > 5
        ? `<br/>… dan ${candidates.length - 5} pengguna lain`
        : "";
    const skippedNote =
      skipped > 0
        ? `<br/><br/><span style="color:#b45309">${skipped} akun dilewati (pemilik utama / akun aktif).</span>`
        : "";

    const confirmation = await Swal.fire({
      title: `Hapus ${candidates.length} pengguna?`,
      html: `<div style="text-align:left;font-size:13px;color:#475569;max-height:220px;overflow:auto">${preview}${more}${skippedNote}</div>`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Ya, hapus",
      cancelButtonText: "Batal",
      confirmButtonColor: "#dc2626",
    });
    if (!confirmation.isConfirmed) return;

    setBulkDeleting(true);
    const failures: string[] = [];
    const deletedIds: string[] = [];
    for (const user of candidates) {
      const result = await deleteUserRequest(user);
      if (result.ok) {
        deletedIds.push(user.id);
      } else {
        failures.push(`${user.name}: ${result.error}`);
      }
    }
    setBulkDeleting(false);
    setSelectedIds((current) =>
      current.filter((id) => !deletedIds.includes(id))
    );
    await loadUsers();

    if (failures.length === 0) {
      await Swal.fire(
        "Terhapus",
        `${deletedIds.length} pengguna berhasil dihapus.`,
        "success"
      );
      return;
    }

    await Swal.fire({
      icon: "warning",
      title: `${deletedIds.length} terhapus, ${failures.length} gagal`,
      html: `<div style="text-align:left;font-size:12px;max-height:240px;overflow:auto">${failures
        .slice(0, 10)
        .map((failure) => `• ${escapeHtml(failure)}`)
        .join("<br/>")}</div>`,
    });
  };

  const handleDetailSelected = async () => {
    const user = await requireSingleSelected("Detail");
    if (user) setDetailUser(user);
  };

  const handleEditSelected = async () => {
    const user = await requireSingleSelected("Edit");
    if (user) await openEditUser(user);
  };

  const handlePinSelected = async () => {
    const user = await requireSingleSelected("Atur ulang PIN");
    if (!user) return;
    if (!canUpdateUsers) {
      await Swal.fire("Akses ditolak", "Anda tidak dapat mengubah akun.", "error");
      return;
    }
    if (user.isOwner || user.role !== "CASHIER") {
      await Swal.fire(
        "Tidak tersedia",
        "Atur ulang PIN hanya berlaku untuk akun kasir.",
        "info"
      );
      return;
    }
    await resetPin(user);
  };

  const editingUser = users.find((user) => user.id === editingUserId) ?? null;

  const detailOutlets =
    detailUser?.role === "CASHIER"
      ? (detailUser.locationIds ?? []).length > 0
        ? outlets
            .filter((outlet) => detailUser.locationIds?.includes(outlet.id))
            .map((outlet) => outlet.name)
        : ["Semua outlet"]
      : [];

  const grantedModules = detailUser
    ? permissionModules
        .map((module) => ({
          module,
          actions: permissionActions.filter(
            (action) => detailUser.permissions?.[module.key]?.[action.key]
          ),
        }))
        .filter((entry) => entry.actions.length > 0)
    : [];

  if (loading) return <BrandLoader label="Memuat akun pengguna..." />;

  return (
    <div className="mx-auto max-w-6xl space-y-5 px-4 py-6 sm:px-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-brand-navy">
          Akun & Hak Akses
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Kelola akun kasir NIK/PIN, administrator, status akun, dan hak akses
          setiap modul.
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"
        >
          {error}
          <button
            onClick={() => void loadUsers()}
            className="ml-3 font-semibold underline"
          >
            Coba lagi
          </button>
        </div>
      )}

      {canCreateUsers && (
        <form
          onSubmit={createCashier}
          className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-2"
        >
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
                PIN (6–12 digit)
                <input
                  type="password"
                  value={pin}
                  onChange={(event) => setPin(event.target.value)}
                  className="form-control mt-1.5"
                  inputMode="numeric"
                  autoComplete="new-password"
                  maxLength={12}
                  minLength={6}
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
                const nextRole =
                  event.target.value === "ADMIN" ? "ADMIN" : "CASHIER";
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
          {role === "CASHIER" && (
            <div className="space-y-2 sm:col-span-2">
              <p className="text-sm font-semibold text-slate-700">Akses outlet</p>
              <p className="text-xs text-slate-500">
                Kosongkan untuk memberi akses ke semua outlet. Pilih outlet
                untuk membatasi kasir ini.
              </p>
              <div className="flex flex-wrap gap-2">
                {outlets.map((outlet) => {
                  const isSelected = locationIds.includes(outlet.id);
                  return (
                    <button
                      key={outlet.id}
                      type="button"
                      onClick={() =>
                        setLocationIds((current) =>
                          current.includes(outlet.id)
                            ? current.filter((id) => id !== outlet.id)
                            : [...current, outlet.id]
                        )
                      }
                      className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                        isSelected
                          ? "border-blue-500 bg-blue-50 text-blue-700"
                          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {outlet.name}
                    </button>
                  );
                })}
                {outlets.length === 0 && (
                  <p className="text-xs text-slate-400">
                    Belum ada outlet terdaftar.
                  </p>
                )}
              </div>
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
        </form>
      )}

      {selectedUsers.length > 0 && (
        <UserBulkToolbar
          count={selectedUsers.length}
          deleting={bulkDeleting}
          onClear={() => setSelectedIds([])}
          onDetail={() => void handleDetailSelected()}
          onEdit={() => void handleEditSelected()}
          onPin={() => void handlePinSelected()}
          onDelete={() => void handleDeleteSelected()}
        />
      )}

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

        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="w-12 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={allFilteredSelected}
                    onChange={toggleSelectAll}
                    aria-label="Pilih semua pengguna yang tampil"
                    ref={(element) => {
                      if (element) element.indeterminate = someFilteredSelected;
                    }}
                    className="h-4 w-4 cursor-pointer rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th className="px-4 py-3">Pengguna</th>
                <th className="px-4 py-3">Peran</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Dibuat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.map((user) => {
                const isSelected = selectedIds.includes(user.id);
                const grantedLabels = permissionModules
                  .filter(({ key }) =>
                    Object.values(user.permissions?.[key] || {}).some(Boolean)
                  )
                  .map(({ label }) => label);
                return (
                  <tr
                    key={user.id}
                    className={`transition hover:bg-slate-50/70 ${
                      isSelected ? "bg-blue-50/50" : ""
                    }`}
                  >
                    <td className="px-4 py-3 align-middle">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(user.id)}
                        aria-label={`Pilih ${user.name}`}
                        className="h-4 w-4 cursor-pointer rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-slate-900">
                          {user.name}
                        </span>
                        {user.isOwner && (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                            Pemilik utama
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {user.role === "CASHIER"
                          ? `NIK: ${user.nik || "Belum diatur"}`
                          : user.email || "-"}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-slate-400">
                        Hak akses:{" "}
                        {grantedLabels.length ? grantedLabels.join(", ") : "Tidak ada"}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={user.role === "ADMIN" ? "info" : "success"}>
                        {user.role === "ADMIN" ? "Administrator" : "Kasir POS"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={user.isActive ? "success" : "default"}
                        withDot
                      >
                        {user.isActive ? "Aktif" : "Nonaktif"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {formatDate(user.createdAt)}
                    </td>
                  </tr>
                );
              })}
              {filteredUsers.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-12 text-center text-sm text-slate-500"
                  >
                    Tidak ada akun yang cocok dengan pencarian atau filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        isOpen={detailUser !== null}
        onClose={() => setDetailUser(null)}
        title={detailUser ? detailUser.name : "Detail Pengguna"}
        description="Informasi akun dan hak akses."
        maxWidth="max-w-2xl"
      >
        {detailUser && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={detailUser.role === "ADMIN" ? "info" : "success"}>
                {detailUser.role === "ADMIN" ? "Administrator" : "Kasir POS"}
              </Badge>
              <Badge
                variant={detailUser.isActive ? "success" : "default"}
                withDot
              >
                {detailUser.isActive ? "Aktif" : "Nonaktif"}
              </Badge>
              {detailUser.isOwner && <Badge variant="purple">Pemilik utama</Badge>}
            </div>

            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs font-medium text-slate-500">
                  {detailUser.role === "CASHIER" ? "NIK" : "Email"}
                </dt>
                <dd className="mt-0.5 font-medium text-slate-900">
                  {detailUser.role === "CASHIER"
                    ? detailUser.nik || "Belum diatur"
                    : detailUser.email || "-"}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-slate-500">Dibuat</dt>
                <dd className="mt-0.5 font-medium text-slate-900">
                  {formatDate(detailUser.createdAt)}
                </dd>
              </div>
              {detailUser.role === "CASHIER" && (
                <div className="sm:col-span-2">
                  <dt className="text-xs font-medium text-slate-500">
                    Akses outlet
                  </dt>
                  <dd className="mt-1 flex flex-wrap gap-1.5">
                    {detailOutlets.map((name) => (
                      <Badge key={name} variant="default">
                        {name}
                      </Badge>
                    ))}
                  </dd>
                </div>
              )}
            </dl>

            <div>
              <p className="text-sm font-semibold text-slate-800">Hak akses</p>
              <div className="mt-2 space-y-2">
                {grantedModules.map(({ module, actions }) => (
                  <div
                    key={module.key}
                    className="rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2"
                  >
                    <p className="text-xs font-semibold text-slate-700">
                      {module.label}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {actions.map((action) => (
                        <Badge key={action.key} variant="info">
                          {action.label}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
                {grantedModules.length === 0 && (
                  <p className="rounded-xl border border-dashed border-slate-200 px-3 py-4 text-center text-xs text-slate-500">
                    Tidak ada hak akses yang diberikan.
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-end">
              <Button variant="secondary" onClick={() => setDetailUser(null)}>
                Tutup
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={editingUser !== null}
        onClose={() => setEditingUserId(null)}
        title="Edit akun dan hak akses"
        description="Perbarui profil, status akun, dan izin modul."
        maxWidth="max-w-3xl"
      >
        {editingUser && (
          <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-semibold text-slate-700">
                Nama lengkap
                <input
                  value={editName}
                  onChange={(event) => setEditName(event.target.value)}
                  className="form-control mt-1.5"
                  required
                />
              </label>
              <label className="text-sm font-semibold text-slate-700">
                Peran pengguna
                <select
                  value={editingRole}
                  onChange={(event) => {
                    const nextRole =
                      event.target.value === "CASHIER" ? "CASHIER" : "ADMIN";
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
              <label className="text-sm font-semibold text-slate-700">
                Status akun
                <select
                  value={editStatus ? "active" : "inactive"}
                  onChange={(event) => setEditStatus(event.target.value === "active")}
                  disabled={editingUser.id === session?.user?.id}
                  className="form-control mt-1.5"
                >
                  <option value="active">Aktif</option>
                  <option value="inactive">Nonaktif</option>
                </select>
                {editingUser.id === session?.user?.id && (
                  <span className="mt-1 block text-[11px] text-slate-400">
                    Akun yang sedang digunakan tidak dapat dinonaktifkan.
                  </span>
                )}
              </label>
              {editingRole === "CASHIER" ? (
                <label className="text-sm font-semibold text-slate-700">
                  NIK
                  <input
                    value={editNik}
                    onChange={(event) =>
                      setEditNik(event.target.value.replace(/\D/g, ""))
                    }
                    className="form-control mt-1.5"
                    inputMode="numeric"
                    maxLength={20}
                    required
                  />
                </label>
              ) : (
                <label className="text-sm font-semibold text-slate-700">
                  Email login
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(event) => setEditEmail(event.target.value)}
                    className="form-control mt-1.5"
                    required
                  />
                </label>
              )}
              {editingRole === "ADMIN" && (
                <label className="text-sm font-semibold text-slate-700 sm:col-span-2">
                  {editingUser.email
                    ? "Password baru (opsional)"
                    : "Password baru (minimal 6 karakter)"}
                  <input
                    type="password"
                    value={editPassword}
                    onChange={(event) => setEditPassword(event.target.value)}
                    className="form-control mt-1.5"
                    autoComplete="new-password"
                    minLength={6}
                    required={!editingUser.email}
                  />
                </label>
              )}
            </div>

            <div className="space-y-2">
              <p className="text-sm font-semibold text-slate-700">
                Hak akses {editingRole === "ADMIN" ? "Administrator" : "Kasir"}
              </p>
              <PermissionsGrid
                value={editPermissions}
                onChange={setEditPermissions}
              />
            </div>

            {editingRole === "CASHIER" && (
              <div className="space-y-2">
                <p className="text-sm font-semibold text-slate-700">
                  Akses outlet
                </p>
                <p className="text-xs text-slate-500">
                  Kosongkan untuk memberi akses ke semua outlet.
                </p>
                <div className="flex flex-wrap gap-2">
                  {outlets.map((outlet) => {
                    const isSelected = editLocationIds.includes(outlet.id);
                    return (
                      <button
                        key={outlet.id}
                        type="button"
                        onClick={() =>
                          setEditLocationIds((current) =>
                            current.includes(outlet.id)
                              ? current.filter((id) => id !== outlet.id)
                              : [...current, outlet.id]
                          )
                        }
                        className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                          isSelected
                            ? "border-blue-500 bg-blue-50 text-blue-700"
                            : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        {outlet.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setEditingUserId(null)}
              >
                Batal
              </Button>
              <Button
                type="button"
                disabled={savingPermissions}
                onClick={() => void savePermissions(editingUser)}
              >
                {savingPermissions ? "Menyimpan..." : "Simpan Perubahan"}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
