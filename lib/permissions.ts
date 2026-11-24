export const permissionModules = [
  { key: "dashboard", label: "Dashboard" },
  { key: "pos", label: "POS Kasir" },
  { key: "products", label: "Produk" },
  { key: "categories", label: "Kategori" },
  { key: "sales", label: "Penjualan" },
  { key: "invoices", label: "Faktur Penjualan" },
  { key: "customers", label: "Pelanggan & Pemasok" },
  { key: "purchases", label: "Pembelian" },
  { key: "inventory", label: "Stok & Penyesuaian" },
  { key: "warehouses", label: "Lokasi Gudang" },
  { key: "cashReconciliation", label: "Rekonsiliasi Kas" },
  { key: "taxes", label: "Pajak" },
  { key: "accounting", label: "Akuntansi & Keuangan" },
  { key: "systemSettings", label: "Pengaturan Sistem & Pengguna" },
] as const;

export const permissionActions = [
  { key: "view", label: "Lihat" },
  { key: "create", label: "Tambah" },
  { key: "update", label: "Edit" },
  { key: "delete", label: "Hapus" },
] as const;

export type PermissionModule = (typeof permissionModules)[number]["key"];
export type PermissionAction = (typeof permissionActions)[number]["key"];
export type ModulePermission = Record<PermissionAction, boolean>;
export type UserPermissions = Partial<Record<PermissionModule, Partial<ModulePermission>>>;

export const defaultCashierPermissions: UserPermissions = {
  pos: { view: true, create: true, update: false, delete: false },
  products: { view: true, create: false, update: false, delete: false },
  categories: { view: true, create: false, update: false, delete: false },
};

export const defaultAdministratorPermissions: UserPermissions = {
  dashboard: { view: true },
  systemSettings: { view: true, create: true, update: true, delete: true },
};

export function createEmptyPermissions(): UserPermissions {
  return Object.fromEntries(
    permissionModules.map(({ key }) => [
      key,
      { view: false, create: false, update: false, delete: false },
    ])
  ) as UserPermissions;
}

export function normalizePermissions(value: unknown): UserPermissions {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  const source = value as Record<string, unknown>;
  const result: UserPermissions = {};
  for (const { key: module } of permissionModules) {
    const moduleValue = source[module];
    if (!moduleValue || typeof moduleValue !== "object" || Array.isArray(moduleValue)) {
      continue;
    }
    const actions = moduleValue as Record<string, unknown>;
    const normalized: Partial<ModulePermission> = {};
    for (const { key: action } of permissionActions) {
      if (typeof actions[action] === "boolean") {
        normalized[action] = actions[action];
      }
    }
    result[module] = normalized;
  }
  return result;
}

export function hasPermission(
  role: string | null | undefined,
  permissions: UserPermissions | null | undefined,
  module: PermissionModule,
  action: PermissionAction
) {
  if (
    role === "ADMIN" &&
    (!permissions || Object.keys(permissions).length === 0)
  ) {
    return true;
  }

  const effectivePermissions =
    role === "CASHIER" && (!permissions || Object.keys(permissions).length === 0)
      ? defaultCashierPermissions
      : permissions;

  return effectivePermissions?.[module]?.[action] === true;
}

/**
 * Daftar outlet dan stok gudang dibutuhkan dua area berbeda:
 * - Cashier Back Office/POS (modul `pos`)
 * - Manajemen gudang (modul `warehouses` / `inventory`)
 *
 * Helper ini dipakai middleware agar route tidak harus dipetakan ke satu
 * modul saja (yang akan memblokir salah satu peran).
 */
export function canReadPosSupportData(
  role: string | null | undefined,
  permissions: UserPermissions | null | undefined,
  pathname: string,
  method: string
) {
  if (method.toUpperCase() !== "GET") return false;
  const isOutletRead =
    pathname === "/api/locations" || pathname.startsWith("/api/locations/");
  const isStockRead = pathname === "/api/warehouse/stock";
  if (!isOutletRead && !isStockRead) return false;

  if (hasPermission(role, permissions, "pos", "view")) return true;
  if (isOutletRead && hasPermission(role, permissions, "warehouses", "view")) {
    return true;
  }
  if (isStockRead && hasPermission(role, permissions, "inventory", "view")) {
    return true;
  }
  return false;
}

/**
 * Konfigurasi mesin kasir boleh dilakukan pemilik sistem (`systemSettings`)
 * atau pengelola gudang (`warehouses`), karena satu mesin terikat ke satu
 * gudang stok. Kasir hanya boleh membaca daftar mesin.
 */
export function canManagePosRegisters(
  role: string | null | undefined,
  permissions: UserPermissions | null | undefined,
  method: string
) {
  if (role !== "ADMIN") return false;
  const upper = method.toUpperCase();
  const action: PermissionAction =
    upper === "POST" ? "create" : upper === "DELETE" ? "delete" : "update";

  return (
    hasPermission(role, permissions, "systemSettings", action) ||
    hasPermission(role, permissions, "warehouses", action)
  );
}

export function getRequiredPermission(
  pathname: string,
  method: string
): { module: PermissionModule; action: PermissionAction } | null {
  const actionByMethod: Record<string, PermissionAction> = {
    GET: "view",
    HEAD: "view",
    POST: "create",
    PUT: "update",
    PATCH: "update",
    DELETE: "delete",
  };
  const action = actionByMethod[method.toUpperCase()];
  if (!action) return null;

  if (
    /^\/api\/(?:invoices|purchases)\/[^/]+\/status$/.test(pathname) &&
    method.toUpperCase() === "POST"
  ) {
    return {
      module: pathname.startsWith("/api/invoices") ? "invoices" : "purchases",
      action: "update",
    };
  }

  if (pathname === "/" || pathname === "/admin/dashboard" || pathname === "/api/reports/dashboard") {
    return { module: "dashboard", action: "view" };
  }
  if (
    pathname === "/admin/settings" ||
    pathname.startsWith("/admin/settings/accounts") ||
    pathname.startsWith("/admin/users") ||
    pathname === "/api/users"
  ) {
    return { module: "systemSettings", action };
  }
  if (/^\/api\/users\/[^/]+$/.test(pathname)) {
    return { module: "systemSettings", action };
  }
  if (pathname === "/api/payments/qris") return { module: "pos", action: "create" };
  if (pathname === "/api/cashier/pin" && method.toUpperCase() === "POST") {
    return { module: "pos", action: "view" };
  }
  if (pathname === "/api/cash-sessions" && method.toUpperCase() === "POST") {
    return { module: "pos", action: "create" };
  }
  // Menutup shift sendiri adalah operasional kasir. Route PATCH
  // `/api/cash-sessions/[id]` membatasi `where: { userId }`, jadi cukup
  // `pos.view` agar kasir default dapat menutup shift-nya tanpa izin update.
  if (
    /^\/api\/cash-sessions\/[^/]+$/.test(pathname) &&
    method.toUpperCase() === "PATCH"
  ) {
    return { module: "pos", action: "view" };
  }
  if (pathname === "/api/sales" && method.toUpperCase() === "POST") {
    return { module: "pos", action: "create" };
  }
  // Mesin kasir: kasir boleh melihat daftar (untuk Back Office), tetapi
  // konfigurasi mesin dan gudangnya adalah wewenang administrator.
  if (/^\/api\/pos-registers(?:\/|$)/.test(pathname)) {
    return { module: "pos", action: "view" };
  }
  if (
    pathname === "/pos/back-office" ||
    pathname.startsWith("/pos/back-office/") ||
    pathname === "/pos" ||
    pathname.startsWith("/pos/")
  ) {
    return { module: "pos", action };
  }

  const rules: Array<[RegExp, PermissionModule]> = [
    [/^\/(?:admin\/settings\/reconciliation|admin\/cash-sessions)(?:\/|$)/, "cashReconciliation"],
    [/^\/api\/cash-sessions\/current$/, "pos"],
    [/^\/api\/cash-sessions$/, "cashReconciliation"],
    [/^\/api\/cash-sessions\/[^/]+$/, "pos"],
    [/^\/(?:api\/)?products(?:\/|$)|^\/admin\/products(?:\/|$)|^\/api\/reports\/barcode(?:\/|$)/, "products"],
    [/^\/(?:api\/)?categories(?:\/|$)|^\/admin\/categories(?:\/|$)/, "categories"],
    [/^\/(?:api\/)?customers(?:\/|$)|^\/sales\/customers(?:\/|$)/, "customers"],
    [/^\/(?:api\/)?purchases(?:\/|$)|^\/purchases(?:\/|$)/, "purchases"],
    [/^\/(?:api\/)?invoices(?:\/|$)|^\/invoices(?:\/|$)|^\/api\/reports\/invoices(?:\/|$)/, "invoices"],
    [/^\/api\/sales(?:\/|$)/, "sales"],
    [/^\/api\/warehouse\/(?:stock|adjustments|transfers)(?:\/|$)|^\/warehouse\/(?:stock|transfers)(?:\/|$)/, "inventory"],
    [/^\/api\/locations(?:\/|$)|^\/warehouse\/locations(?:\/|$)|^\/warehouse\/registers(?:\/|$)/, "warehouses"],
    [/^\/api\/taxes(?:\/|$)/, "taxes"],
    [/^\/(?:api\/)?accounting(?:\/|$)|^\/admin\/accounting(?:\/|$)/, "accounting"],
  ];

  const rule = rules.find(([pattern]) => pattern.test(pathname));
  return rule ? { module: rule[1], action } : null;
}
