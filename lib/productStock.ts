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

async function ensureLocationStock(
  tx: TransactionClient,
  productId: number,
  locationId: number
) {
  const existing = await tx.productStock.count({ where: { productId } });
  if (existing > 0) return;

  const product = await tx.product.findUnique({
    where: { id: productId },
    select: { stock: true },
  });
  if (!product) throw new InvalidStockError("Produk tidak ditemukan");

  await tx.productStock.create({
    data: { productId, locationId, quantity: product.stock },
  });
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
  }
) {
  const { productId, locationId, qty, productName } = params;
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
  if (updated.count !== 1) {
    const row = await tx.productStock.findUnique({
      where: { productId_locationId: { productId, locationId } },
      select: { quantity: true },
    });
    throw new InsufficientStockError(
      `Stok ${productName ?? "produk"} tidak cukup (tersedia ${row?.quantity ?? 0}, dibutuhkan ${qty})`
    );
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

  await tx.productStock.upsert({
    where: { productId_locationId: { productId, locationId } },
    update: { quantity },
    create: { productId, locationId, quantity },
  });
  await recalculateProductStock(tx, productId);
}
