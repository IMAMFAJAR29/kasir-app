import type { Prisma, PrismaClient } from "@prisma/client";

export type BomDbClient = Prisma.TransactionClient | PrismaClient;

export interface BundleComponentDetail {
  componentProductId: number;
  quantity: number;
  costPrice: number;
  name: string;
}

export class BomInputError extends Error {
  field: string;

  constructor(field: string, message: string) {
    super(message);
    this.name = "BomInputError";
    this.field = field;
  }
}

export const MAX_BUNDLE_COMPONENTS = 100;

/**
 * Ambil komposisi bundle untuk sekumpulan productId.
 *
 * Produk yang bukan bundle tidak muncul di map. Satu query saja, termasuk
 * costPrice & nama komponen agar pemanggil tidak perlu query N+1.
 */
export async function loadBundleMap(
  db: BomDbClient,
  productIds: number[]
): Promise<Map<number, BundleComponentDetail[]>> {
  const uniqueIds = Array.from(new Set(productIds.filter((id) => Number.isSafeInteger(id) && id > 0)));
  const map = new Map<number, BundleComponentDetail[]>();
  if (uniqueIds.length === 0) return map;

  const boms = await db.bom.findMany({
    where: { productId: { in: uniqueIds } },
    select: {
      productId: true,
      components: {
        select: {
          componentProductId: true,
          quantity: true,
          componentProduct: { select: { costPrice: true, name: true } },
        },
        orderBy: { id: "asc" },
      },
    },
  });

  for (const bom of boms) {
    map.set(
      bom.productId,
      bom.components.map((component) => ({
        componentProductId: component.componentProductId,
        quantity: component.quantity,
        costPrice: Number(component.componentProduct?.costPrice ?? 0),
        name: component.componentProduct?.name ?? `Produk #${component.componentProductId}`,
      }))
    );
  }

  return map;
}

/**
 * Stok bundle = min(floor(stok komponen / qty per bundle)).
 * Bundle tanpa komponen dianggap stok 0.
 */
export function computeBundleStock(
  components: Array<{ componentProductId: number; quantity: number }>,
  availableByProductId: Map<number, number>
): number {
  if (components.length === 0) return 0;

  let minimum = Number.POSITIVE_INFINITY;
  for (const component of components) {
    if (!Number.isInteger(component.quantity) || component.quantity <= 0) return 0;
    const available = availableByProductId.get(component.componentProductId) ?? 0;
    const possible = Math.floor(available / component.quantity);
    if (possible < minimum) minimum = possible;
    if (minimum === 0) return 0;
  }

  return Number.isFinite(minimum) ? Math.max(0, minimum) : 0;
}

/**
 * Ubah line penjualan menjadi konsumsi stok nyata.
 * Bundle di-expand ke komponennya; produk satuan tetap apa adanya.
 * Hasil digabung per productId agar satu komponen tidak dikurangi berkali-kali.
 */
export function explodeItems(
  items: Array<{ productId: number; qty: number }>,
  bundleMap: Map<number, Array<{ componentProductId: number; quantity: number }>>
): Array<{ productId: number; qty: number }> {
  const totals = new Map<number, number>();
  const order: number[] = [];

  const add = (productId: number, qty: number) => {
    if (!totals.has(productId)) order.push(productId);
    totals.set(productId, (totals.get(productId) ?? 0) + qty);
  };

  for (const item of items) {
    const components = bundleMap.get(item.productId);
    if (!components || components.length === 0) {
      add(item.productId, item.qty);
      continue;
    }
    for (const component of components) {
      add(component.componentProductId, item.qty * component.quantity);
    }
  }

  return order.map((productId) => ({ productId, qty: totals.get(productId) ?? 0 }));
}

/**
 * Kembalikan konsumsi stok untuk item faktur dengan memakai snapshot komposisi
 * yang tersimpan. Fallback ke productId/qty untuk item non-bundle atau faktur
 * lama yang belum punya snapshot.
 */
export function restoreItemsToConsumption(
  items: Array<{
    productId: number;
    qty: number;
    components?: unknown;
  }>
): Array<{ productId: number; qty: number }> {
  const totals = new Map<number, number>();
  const order: number[] = [];

  const add = (productId: number, qty: number) => {
    if (!totals.has(productId)) order.push(productId);
    totals.set(productId, (totals.get(productId) ?? 0) + qty);
  };

  for (const item of items) {
    const snapshot = parseComponentSnapshot(item.components);
    if (snapshot && snapshot.length > 0) {
      for (const component of snapshot) {
        add(component.productId, component.qty);
      }
      continue;
    }
    add(item.productId, item.qty);
  }

  return order.map((productId) => ({ productId, qty: totals.get(productId) ?? 0 }));
}

export function parseComponentSnapshot(
  value: unknown
): Array<{ productId: number; qty: number }> | null {
  if (!Array.isArray(value)) return null;
  const result: Array<{ productId: number; qty: number }> = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object") continue;
    const source = entry as Record<string, unknown>;
    const productId = Number(source.productId);
    const qty = Number(source.qty);
    if (!Number.isSafeInteger(productId) || productId <= 0) continue;
    if (!Number.isSafeInteger(qty) || qty <= 0) continue;
    result.push({ productId, qty });
  }
  return result.length > 0 ? result : null;
}

/** Bentuk baris komponen yang dikirim ke klien. */
export interface BundleComponentPayload {
  componentProductId: number;
  quantity: number;
}

type ProductWithBomShape = {
  stock: number;
  bom?: {
    components?: Array<{ componentProductId: number; quantity: number }>;
  } | null;
};

/**
 * Bentuk respons produk yang seragam untuk GET/POST/PUT:
 * `bom` dihapus, diganti `isBundle` + `bundleComponents`, dan `stock`
 * di-override dengan stok turunan untuk produk bundle.
 */
export function toProductResponse<T extends ProductWithBomShape>(
  product: T,
  availableByProductId: Map<number, number>
): Omit<T, "bom"> & {
  isBundle: boolean;
  bundleComponents: BundleComponentPayload[];
  stock: number;
} {
  const components: BundleComponentPayload[] =
    product.bom?.components?.map((component) => ({
      componentProductId: component.componentProductId,
      quantity: component.quantity,
    })) ?? [];
  const isBundle = Boolean(product.bom);
  const { bom: _bom, ...rest } = product;

  return {
    ...rest,
    isBundle,
    bundleComponents: isBundle ? components : [],
    stock: isBundle
      ? computeBundleStock(components, availableByProductId)
      : product.stock,
  };
}

