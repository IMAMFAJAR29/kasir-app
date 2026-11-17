import type { Prisma } from "@prisma/client";

type TransactionClient = Prisma.TransactionClient;

export class InsufficientStockError extends Error {
  code = "INSUFFICIENT_STOCK";

  constructor(message: string) {
    super(message);
    this.name = "InsufficientStockError";
  }
}

export class InvalidStockError extends Error {
  code = "INVALID_STOCK";

  constructor(message: string) {
    super(message);
    this.name = "InvalidStockError";
  }
}

export async function getDefaultLocationId(
  tx: TransactionClient
): Promise<number | null> {
  const location = await tx.location.findFirst({
    where: { isActive: true },
    orderBy: { id: "asc" },
    select: { id: true },
  });
  return location?.id ?? null;
}

/**
 * Pastikan baris stok untuk lokasi tertentu tersedia.
 *
 * - Jika baris lokasi target sudah ada, tidak ada yang dilakukan.
 * - Jika produk belum punya baris stok sama sekali (produk legacy), total
 *   `Product.stock` di-seed ke lokasi target.
 * - Jika produk sudah punya baris di lokasi lain, baris lokasi target dibuat
 *   dengan quantity 0 agar stok tidak berpindah lokasi secara diam-diam.
 */
async function ensureLocationStock(
  tx: TransactionClient,
  productId: number,
  locationId: number
) {
  const existing = await tx.productStock.findUnique({
    where: { productId_locationId: { productId, locationId } },
    select: { id: true },
  });
  if (existing) return;

  const rowCount = await tx.productStock.count({ where: { productId } });
  let seedQuantity = 0;

  if (rowCount === 0) {
    const product = await tx.product.findUnique({
      where: { id: productId },
      select: { stock: true },
    });
    if (!product) throw new InvalidStockError("Produk tidak ditemukan");
    seedQuantity = product.stock;
  }

  await tx.productStock.upsert({
    where: { productId_locationId: { productId, locationId } },
    update: { quantity: { increment: 0 } },
    create: { productId, locationId, quantity: seedQuantity },
  });
}

/**
 * Baca quantity stok pada satu lokasi, sekaligus melakukan seeding produk
 * legacy. Dipakai oleh alur penyesuaian stok agar `oldQuantity` tidak salah
 * terbaca 0 untuk produk yang belum memiliki baris `ProductStock`.
 */
export async function getLocationStockQuantity(
  tx: TransactionClient,
  productId: number,
  locationId: number
): Promise<number> {
  await ensureLocationStock(tx, productId, locationId);
  const row = await tx.productStock.findUnique({
    where: { productId_locationId: { productId, locationId } },
    select: { quantity: true },
  });
  return row?.quantity ?? 0;
}

export async function recalculateProductStock(
  tx: TransactionClient,
  productId: number
) {
  const aggregate = await tx.productStock.aggregate({
    where: { productId },
    _sum: { quantity: true },
  });

  await tx.product.update({
    where: { id: productId },
    data: { stock: aggregate._sum.quantity ?? 0 },
  });
}

export async function applyProductStockChange(
  tx: TransactionClient,
  params: {
    productId: number;
    nextStock: number;
    locationId: number | null;
    productName?: string;
  }
) {
  const { productId, nextStock, locationId, productName } = params;

  if (!Number.isInteger(nextStock) || nextStock < 0) {
    throw new InvalidStockError(
      "Stok harus berupa bilangan bulat dan tidak boleh negatif"
    );
  }

  if (!locationId) {
    await tx.product.update({
      where: { id: productId },
      data: { stock: nextStock },
    });
    return;
  }

  await ensureLocationStock(tx, productId, locationId);

  const rows = await tx.productStock.findMany({
    where: { productId },
    select: { id: true, locationId: true, quantity: true },
  });
  const currentTotal = rows.reduce((sum, row) => sum + row.quantity, 0);
  const delta = nextStock - currentTotal;

  if (delta > 0) {
    const target = rows.find((row) => row.locationId === locationId);
    if (target) {
      await tx.productStock.update({
        where: { id: target.id },
        data: { quantity: { increment: delta } },
      });
    } else {
      await tx.productStock.create({
        data: { productId, locationId, quantity: delta },
      });
    }
  } else if (delta < 0) {
    let remaining = Math.abs(delta);
    const ordered = [...rows].sort((left, right) => {
      if (left.locationId === locationId) return -1;
      if (right.locationId === locationId) return 1;
      return left.locationId - right.locationId;
    });

    for (const row of ordered) {
      if (remaining <= 0) break;
      const reduction = Math.min(row.quantity, remaining);
      if (reduction <= 0) continue;

      await tx.productStock.update({
        where: { id: row.id },
        data: { quantity: { decrement: reduction } },
      });
      remaining -= reduction;
    }

    if (remaining > 0) {
      throw new InsufficientStockError(
        `Stok ${productName ?? "produk"} tidak cukup untuk dikurangi (kurang ${remaining})`
      );
    }
  }

  await recalculateProductStock(tx, productId);
}

export async function decrementStockAtLocation(
  tx: TransactionClient,
  params: {
    productId: number;
    locationId: number | null;
    qty: number;
    productName?: string;
    /**
     * Jika true, kekurangan stok di lokasi target boleh diambil dari lokasi
     * lain. Dipakai oleh POS yang tidak memiliki pemilih lokasi.
     */
    allowOtherLocations?: boolean;
  }
) {
  const { productId, locationId, qty, productName, allowOtherLocations = false } =
    params;
  if (!Number.isInteger(qty) || qty <= 0) {
    throw new InvalidStockError("Qty harus berupa bilangan bulat positif");
  }

  if (!locationId) {
    const updated = await tx.product.updateMany({
      where: { id: productId, stock: { gte: qty } },
      data: { stock: { decrement: qty } },
    });
    if (updated.count !== 1) {
      const product = await tx.product.findUnique({
        where: { id: productId },
        select: { stock: true },
      });
      throw new InsufficientStockError(
        `Stok ${productName ?? "produk"} tidak cukup (tersedia ${product?.stock ?? 0}, dibutuhkan ${qty})`
      );
    }
    return;
  }

  await ensureLocationStock(tx, productId, locationId);

  const updated = await tx.productStock.updateMany({
    where: { productId, locationId, quantity: { gte: qty } },
    data: { quantity: { decrement: qty } },
  });
  if (updated.count === 1) {
    await recalculateProductStock(tx, productId);
    return;
  }

  const rows = await tx.productStock.findMany({
    where: { productId },
    select: { id: true, locationId: true, quantity: true },
  });
  const availableHere =
    rows.find((row) => row.locationId === locationId)?.quantity ?? 0;
  const availableElsewhere = rows
    .filter((row) => row.locationId !== locationId)
    .reduce((sum, row) => sum + row.quantity, 0);

  if (!allowOtherLocations) {
    throw new InsufficientStockError(
      `Stok ${productName ?? "produk"} di lokasi ini tidak cukup ` +
        `(tersedia ${availableHere}, dibutuhkan ${qty}` +
        (availableElsewhere > 0
          ? `; tersedia ${availableElsewhere} di lokasi lain`
          : "") +
        ")"
    );
  }

  if (availableHere + availableElsewhere < qty) {
    throw new InsufficientStockError(
      `Stok ${productName ?? "produk"} tidak cukup ` +
        `(tersedia ${availableHere + availableElsewhere}, dibutuhkan ${qty})`
    );
  }

  let remaining = qty;
  const ordered = [...rows].sort((left, right) => {
    if (left.locationId === locationId) return -1;
    if (right.locationId === locationId) return 1;
    return left.locationId - right.locationId;
  });

  for (const row of ordered) {
    if (remaining <= 0) break;
    const reduction = Math.min(row.quantity, remaining);
    if (reduction <= 0) continue;

    await tx.productStock.update({
      where: { id: row.id },
      data: { quantity: { decrement: reduction } },
    });
    remaining -= reduction;
  }

  await recalculateProductStock(tx, productId);
}

export async function incrementStockAtLocation(
  tx: TransactionClient,
  params: { productId: number; locationId: number | null; qty: number }
) {
  const { productId, locationId, qty } = params;
  if (!Number.isInteger(qty) || qty <= 0) {
    throw new InvalidStockError("Qty harus berupa bilangan bulat positif");
  }

  if (!locationId) {
    await tx.product.update({
      where: { id: productId },
      data: { stock: { increment: qty } },
    });
    return;
  }

  await ensureLocationStock(tx, productId, locationId);
  await tx.productStock.upsert({
    where: { productId_locationId: { productId, locationId } },
    update: { quantity: { increment: qty } },
    create: { productId, locationId, quantity: qty },
  });
  await recalculateProductStock(tx, productId);
}

export async function setStockAtLocation(
  tx: TransactionClient,
  params: {
    productId: number;
    locationId: number | null;
    quantity: number;
  }
) {
  const { productId, locationId, quantity } = params;
  if (!Number.isInteger(quantity) || quantity < 0) {
    throw new InvalidStockError(
      "Stok baru harus berupa bilangan bulat dan tidak boleh negatif"
    );
  }

  if (!locationId) {
    await tx.product.update({
      where: { id: productId },
      data: { stock: quantity },
    });
    return;
  }

  await ensureLocationStock(tx, productId, locationId);
  await tx.productStock.upsert({
    where: { productId_locationId: { productId, locationId } },
    update: { quantity },
    create: { productId, locationId, quantity },
  });
  await recalculateProductStock(tx, productId);
}
