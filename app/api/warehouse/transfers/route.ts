import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma, { TRANSACTION_OPTIONS } from "@/lib/prisma";
import { authOptions } from "@/lib/authOptions";
import { hasPermission } from "@/lib/permissions";
import {
  decrementStockAtLocation,
  InsufficientStockError,
  InvalidStockError,
} from "@/lib/productStock";
import { processStockTransferSendAccounting } from "@/lib/accounting/transferAccounting";

interface NormalizedItem {
  productId: number;
  qty: number;
}

function mergeItems(items: NormalizedItem[]): NormalizedItem[] {
  const totals = new Map<number, number>();
  const order: number[] = [];
  for (const item of items) {
    if (!totals.has(item.productId)) order.push(item.productId);
    totals.set(item.productId, (totals.get(item.productId) ?? 0) + item.qty);
  }
  return order.map((productId) => ({
    productId,
    qty: totals.get(productId) ?? 0,
  }));
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (
    !session?.user?.id ||
    !hasPermission(
      session.user.role,
      session.user.permissions,
      "inventoryTransfer",
      "view"
    )
  ) {
    return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
  }

  const transfers = await prisma.stockTransfer.findMany({
    orderBy: [{ date: "desc" }, { id: "desc" }],
    take: 100,
    include: {
      fromLocation: { select: { id: true, name: true } },
      toLocation: { select: { id: true, name: true } },
      items: {
        orderBy: { id: "asc" },
        select: {
          id: true,
          productId: true,
          qty: true,
          receivedQty: true,
          costPrice: true,
          product: { select: { name: true, sku: true } },
        },
      },
    },
  });

  return NextResponse.json(
    transfers.map((transfer) => ({
      id: transfer.id,
      no: transfer.no,
      date: transfer.date,
      note: transfer.note,
      status: transfer.status,
      sentAt: transfer.sentAt,
      receivedAt: transfer.receivedAt,
      receivedBy: transfer.receivedBy,
      fromLocation: transfer.fromLocation,
      toLocation: transfer.toLocation,
      itemCount: transfer.items.length,
      totalQty: transfer.items.reduce((sum, item) => sum + item.qty, 0),
      totalReceived: transfer.items.reduce(
        (sum, item) => sum + (item.receivedQty ?? 0),
        0
      ),
      items: transfer.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        name: item.product?.name ?? `Produk #${item.productId}`,
        sku: item.product?.sku ?? "-",
        qty: item.qty,
        receivedQty: item.receivedQty,
        costPrice: Number(item.costPrice),
      })),
    }))
  );
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (
    !session?.user?.id ||
    !hasPermission(
      session.user.role,
      session.user.permissions,
      "inventoryTransfer",
      "create"
    )
  ) {
    return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Data permintaan tidak valid" }, { status: 400 });
  }
  const source = (body ?? {}) as Record<string, unknown>;

  const fromLocationId = Number(source.fromLocationId);
  const toLocationId = Number(source.toLocationId);
  if (!Number.isSafeInteger(fromLocationId) || fromLocationId <= 0) {
    return NextResponse.json({ error: "Gudang asal tidak valid" }, { status: 400 });
  }
  if (!Number.isSafeInteger(toLocationId) || toLocationId <= 0) {
    return NextResponse.json({ error: "Gudang tujuan tidak valid" }, { status: 400 });
  }
  if (fromLocationId === toLocationId) {
    return NextResponse.json(
      { error: "Gudang asal dan tujuan tidak boleh sama" },
      { status: 400 }
    );
  }

  const rawItems = Array.isArray(source.items) ? source.items : [];
  const normalizedItems: NormalizedItem[] = rawItems.map((item: unknown) => {
    const entry = (item ?? {}) as Record<string, unknown>;
    return { productId: Number(entry.productId), qty: Number(entry.qty) };
  });
  if (
    normalizedItems.length === 0 ||
    normalizedItems.some(
      (item) =>
        !Number.isSafeInteger(item.productId) ||
        item.productId <= 0 ||
        !Number.isSafeInteger(item.qty) ||
        item.qty <= 0
    )
  ) {
    return NextResponse.json(
      { error: "Daftar produk transfer tidak valid" },
      { status: 400 }
    );
  }
  const items = mergeItems(normalizedItems);

  const transferDate = source.date ? new Date(String(source.date)) : new Date();
  if (Number.isNaN(transferDate.getTime())) {
    return NextResponse.json({ error: "Tanggal transfer tidak valid" }, { status: 400 });
  }
  const note = typeof source.note === "string" ? source.note.trim() || null : null;
  const transferNo =
    typeof source.no === "string" && source.no.trim()
      ? source.no.trim()
      : `TRF-${Date.now()}`;
  const requestKey =
    typeof source.requestKey === "string" && source.requestKey.trim()
      ? source.requestKey.trim()
      : null;

  const findExisting = async () => {
    if (!requestKey) return null;
    return prisma.stockTransfer.findUnique({
      where: { requestKey },
      include: {
        fromLocation: { select: { id: true, name: true } },
        toLocation: { select: { id: true, name: true } },
      },
    });
  };

  const existing = await findExisting();
  if (existing) {
    return NextResponse.json(existing, { status: 200 });
  }

  try {
    const transfer = await prisma.$transaction(async (tx) => {
      if (requestKey) {
        const duplicate = await tx.stockTransfer.findUnique({
          where: { requestKey },
          include: {
            fromLocation: { select: { id: true, name: true } },
            toLocation: { select: { id: true, name: true } },
          },
        });
        if (duplicate) return duplicate;
      }

      const [fromLocation, toLocation] = await Promise.all([
        tx.location.findUnique({
          where: { id: fromLocationId },
          select: { id: true, name: true },
        }),
        tx.location.findUnique({
          where: { id: toLocationId },
          select: { id: true, name: true },
        }),
      ]);
      if (!fromLocation) throw new InvalidStockError("Gudang asal tidak ditemukan");
      if (!toLocation) throw new InvalidStockError("Gudang tujuan tidak ditemukan");

      const productIds = items.map((item) => item.productId);
      const products = await tx.product.findMany({
        where: { id: { in: productIds } },
        select: {
          id: true,
          name: true,
          costPrice: true,
          bom: { select: { id: true } },
        },
      });
      const productMap = new Map(products.map((product) => [product.id, product]));

      const missing = productIds.filter((id) => !productMap.has(id));
      if (missing.length > 0) {
        throw new InvalidStockError(
          `Produk tidak ditemukan: ${missing.join(", ")}`
        );
      }
      const bundle = products.filter((product) => product.bom);
      if (bundle.length > 0) {
        throw new InvalidStockError(
          `Produk bundle tidak bisa ditransfer langsung (${bundle
            .map((product) => product.name)
            .join(", ")}). Pindahkan komponennya.`
        );
      }

      const created = await tx.stockTransfer.create({
        data: {
          no: transferNo,
          requestKey,
          date: transferDate,
          fromLocationId,
          toLocationId,
          note,
          status: "IN_TRANSIT",
          sentAt: new Date(),
          createdBy: session.user.id,
        },
      });

      let totalValue = 0;

      for (const item of items) {
        const product = productMap.get(item.productId)!;
        // Stok asal wajib cukup; transfer tidak boleh mengambil dari gudang lain.
        await decrementStockAtLocation(tx, {
          productId: item.productId,
          locationId: fromLocationId,
          qty: item.qty,
          productName: product.name,
          allowOtherLocations: false,
        });

        const costPrice = Number(product.costPrice || 0);
        totalValue += costPrice * item.qty;

        await tx.stockTransferItem.create({
          data: {
            transferId: created.id,
            productId: item.productId,
            qty: item.qty,
            costPrice,
          },
        });
      }

      await processStockTransferSendAccounting(
        created.id,
        created.no,
        created.date,
        fromLocationId,
        totalValue,
        tx
      );

      return tx.stockTransfer.findUniqueOrThrow({
        where: { id: created.id },
        include: {
          fromLocation: { select: { id: true, name: true } },
          toLocation: { select: { id: true, name: true } },
        },
      });
    }, TRANSACTION_OPTIONS);

    return NextResponse.json(transfer, { status: 201 });
  } catch (error) {
    if (error instanceof InsufficientStockError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    if (error instanceof InvalidStockError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2002"
    ) {
      const duplicate = await findExisting();
      if (duplicate) {
        return NextResponse.json(duplicate, { status: 200 });
      }
      return NextResponse.json(
        { error: "Nomor transfer sudah digunakan" },
        { status: 409 }
      );
    }
    console.error("Gagal membuat transfer stok:", error);
    return NextResponse.json(
      { error: "Gagal membuat transfer stok" },
      { status: 500 }
    );
  }
}
