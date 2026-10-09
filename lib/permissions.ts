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
  if (pathname === "/api/cash-sessions" && method.toUpperCase() === "POST") {
    return { module: "pos", action: "create" };
  }
  if (pathname === "/api/sales" && method.toUpperCase() === "POST") {
    return { module: "pos", action: "create" };
  }
  if (pathname === "/pos" || pathname.startsWith("/pos/")) {
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
    [/^\/api\/warehouse\/(?:stock|adjustments)(?:\/|$)|^\/warehouse\/stock(?:\/|$)/, "inventory"],
    [/^\/api\/locations(?:\/|$)|^\/warehouse\/locations(?:\/|$)/, "warehouses"],
    [/^\/api\/taxes(?:\/|$)/, "taxes"],
  ];

  const rule = rules.find(([pattern]) => pattern.test(pathname));
  return rule ? { module: rule[1], action } : null;
}
