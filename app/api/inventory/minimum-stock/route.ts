import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma, { TRANSACTION_OPTIONS } from "@/lib/prisma";
import { authOptions } from "@/lib/authOptions";
import { hasPermission } from "@/lib/permissions";
import { canAccessLocation } from "@/lib/posAccess";

interface MinimumStockInput {
  productId: number;
  minStock: number;
}

/**
 * Simpan batas minimum stok per produk untuk satu gudang.
 * Body: { locationId: number, items: { productId, minStock }[] }
 */
export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (
    !session?.user?.id ||
    !hasPermission(
      session.user.role,
      session.user.permissions,
      "inventory",
      "update"
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
  const locationId = Number(source.locationId);
  if (!Number.isSafeInteger(locationId) || locationId <= 0) {
    return NextResponse.json({ error: "Gudang tidak valid" }, { status: 400 });
  }

  if (
    !(await canAccessLocation(
      prisma,
      session.user.id,
      session.user.role,
      locationId
    ))
  ) {
    return NextResponse.json(
      { error: "Anda tidak memiliki akses ke gudang ini" },
      { status: 403 }
    );
  }

  const rawItems = Array.isArray(source.items) ? source.items : [];
  const normalized = rawItems.map((item: unknown) => {
    const entry = (item ?? {}) as Record<string, unknown>;
    return {
      productId: Number(entry.productId),
      minStock: Number(entry.minStock),
    };
  });

  if (
    normalized.length === 0 ||
    normalized.some(
      (item) =>
        !Number.isSafeInteger(item.productId) ||
        item.productId <= 0 ||
        !Number.isSafeInteger(item.minStock) ||
        item.minStock < 0
    )
  ) {
    return NextResponse.json(
      { error: "Daftar minimum stok tidak valid" },
      { status: 400 }
    );
  }

  // Satu produk hanya diproses sekali (nilai terakhir menang).
  const itemsById = new Map<number, MinimumStockInput>();
  for (const item of normalized) {
    itemsById.set(item.productId, item);
  }
  const items = Array.from(itemsById.values());

  try {
    const result = await prisma.$transaction(async (tx) => {
      const bundleRows = await tx.bom.findMany({
        where: { productId: { in: items.map((item) => item.productId) } },
        select: { product: { select: { name: true } } },
      });
      if (bundleRows.length > 0) {
        return {
          error: `Produk bundle tidak memiliki stok sendiri (${bundleRows
            .map((row) => row.product.name)
            .join(", ")}). Atur minimum pada komponennya.`,
        };
      }

      for (const item of items) {
        await tx.productMinimumStock.upsert({
          where: {
            productId_locationId: {
              productId: item.productId,
              locationId,
            },
          },
          update: { minStock: item.minStock },
          create: {
            productId: item.productId,
            locationId,
            minStock: item.minStock,
          },
        });
      }

      return { updated: items.length };
    }, TRANSACTION_OPTIONS);

    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Gagal menyimpan minimum stok:", error);
    return NextResponse.json(
      { error: "Gagal menyimpan minimum stok" },
      { status: 500 }
    );
  }
}
