import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { computeBundleStock } from "@/lib/bom";

type DbClient = Prisma.TransactionClient | typeof prisma;

export interface LocationStockRow {
  id: number;
  productId: number;
  name: string;
  sku: string;
  imageUrl: string;
  categoryId: number | null;
  categoryName: string | null;
  isBundle: boolean;
  stock: number;
  minStock: number;
}

/**
 * Snapshot stok seluruh produk pada satu gudang.
 * Dipakai bersama oleh API stok dan ringkasan persediaan agar aturan
 * fallback produk legacy dan perhitungan bundle tidak diduplikasi.
 */
export async function getLocationStockSnapshot(
  db: DbClient,
  locationId: number
): Promise<LocationStockRow[]> {
  const [products, stocks, trackedRows, boms, minimumRows] = await Promise.all([
    db.product.findMany({
      include: { category: { select: { id: true, name: true } } },
      orderBy: { name: "asc" },
    }),
    db.productStock.findMany({ where: { locationId } }),
    db.productStock.findMany({
      distinct: ["productId"],
      select: { productId: true },
    }),
    db.bom.findMany({
      select: {
        productId: true,
        components: { select: { componentProductId: true, quantity: true } },
      },
    }),
    db.productMinimumStock.findMany({
      where: { locationId },
      select: { productId: true, minStock: true },
    }),
  ]);

  // Produk yang sudah punya baris stok di lokasi mana pun. Produk di luar
  // daftar ini adalah produk legacy yang masih memakai Product.stock.
  const trackedProductIds = new Set(trackedRows.map((row) => row.productId));
  const quantityByProduct = new Map(
    stocks.map((row) => [row.productId, row.quantity])
  );
  const minimumByProduct = new Map(
    minimumRows.map((row) => [row.productId, row.minStock])
  );
  const bundleMap = new Map(
    boms.map((bom) => [
      bom.productId,
      bom.components.map((component) => ({
        componentProductId: component.componentProductId,
        quantity: component.quantity,
      })),
    ])
  );
  const legacyStockByProduct = new Map(
    products.map((product) => [product.id, product.stock])
  );

  const stockOf = (productId: number, fallbackLegacyStock: number) =>
    quantityByProduct.get(productId) ??
    (trackedProductIds.has(productId) ? 0 : fallbackLegacyStock);

  return products.map((product) => {
    const components = bundleMap.get(product.id);
    const isBundle = Boolean(components);
    const availableByProductId = new Map(
      Array.from(new Set((components ?? []).map((c) => c.componentProductId))).map(
        (componentId) => [
          componentId,
          stockOf(componentId, legacyStockByProduct.get(componentId) ?? 0),
        ]
      )
    );

    return {
      id: product.id,
      productId: product.id,
      name: product.name,
      sku: product.sku,
      imageUrl: product.imageUrl || "",
      categoryId: product.categoryId ?? null,
      categoryName: product.category?.name ?? null,
      isBundle,
      stock: isBundle
        ? computeBundleStock(components ?? [], availableByProductId)
        : stockOf(product.id, product.stock),
      // Bundle tidak punya kebijakan minimum karena stoknya turunan.
      minStock: isBundle ? 0 : minimumByProduct.get(product.id) ?? 0,
    };
  });
}
