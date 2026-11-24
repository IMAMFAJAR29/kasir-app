import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/authOptions";
import { hasPermission } from "@/lib/permissions";
import { canAccessLocation } from "@/lib/posAccess";
import { getLocationStockSnapshot } from "@/lib/inventoryStock";

/**
 * Ringkasan persediaan per gudang.
 * Metrik "menipis" memakai ProductMinimumStock (minStock > 0), bukan ambang
 * hardcoded, agar kebijakan tiap gudang dapat berbeda.
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (
    !session?.user?.id ||
    !hasPermission(
      session.user.role,
      session.user.permissions,
      "inventory",
      "view"
    )
  ) {
    return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const locationParam = searchParams.get("locationId");
  let locationId: number | null = null;

  if (locationParam) {
    const parsed = Number(locationParam);
    if (!Number.isSafeInteger(parsed) || parsed <= 0) {
      return NextResponse.json({ error: "locationId tidak valid" }, { status: 400 });
    }
    locationId = parsed;
  } else {
    const first = await prisma.location.findFirst({
      where: { isActive: true },
      orderBy: { id: "asc" },
      select: { id: true },
    });
    locationId = first?.id ?? null;
  }

  if (locationId === null) {
    return NextResponse.json({
      location: null,
      totalProducts: 0,
      totalUnits: 0,
      availableCount: 0,
      lowCount: 0,
      outCount: 0,
      configuredCount: 0,
      lowProducts: [],
    });
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

  const location = await prisma.location.findUnique({
    where: { id: locationId },
    select: { id: true, name: true },
  });

  const rows = await getLocationStockSnapshot(prisma, locationId);
  const stockRows = rows.filter((row) => !row.isBundle);

  let totalUnits = 0;
  let availableCount = 0;
  let lowCount = 0;
  let outCount = 0;
  let configuredCount = 0;
  const lowProducts: Array<{
    id: number;
    name: string;
    sku: string;
    stock: number;
    minStock: number;
  }> = [];

  for (const row of stockRows) {
    totalUnits += row.stock;
    if (row.minStock > 0) configuredCount += 1;

    if (row.stock <= 0) {
      outCount += 1;
      continue;
    }
    if (row.minStock > 0 && row.stock <= row.minStock) {
      lowCount += 1;
      lowProducts.push({
        id: row.id,
        name: row.name,
        sku: row.sku,
        stock: row.stock,
        minStock: row.minStock,
      });
    } else {
      availableCount += 1;
    }
  }

  lowProducts.sort(
    (a, b) => a.stock - a.minStock - (b.stock - b.minStock)
  );

  return NextResponse.json({
    location,
    totalProducts: rows.length,
    stockProducts: stockRows.length,
    totalUnits,
    availableCount,
    lowCount,
    outCount,
    configuredCount,
    lowProducts: lowProducts.slice(0, 8),
  });
}
