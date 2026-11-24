import prisma, { TRANSACTION_OPTIONS } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { hasPermission } from "@/lib/permissions";
import { processStockAdjustmentAccounting } from "@/lib/accounting/adjustmentAccounting";
import {
  getLocationStockQuantity,
  setStockAtLocation,
  InsufficientStockError,
  InvalidStockError,
} from "@/lib/productStock";
import { getErrorMessage } from "@/lib/prismaErrors";

type AdjustmentMode = "set" | "add" | "subtract";

interface NormalizedItem {
  productId: number;
  mode: AdjustmentMode;
  value: number;
}

/**
 * Riwayat penyesuaian stok. Mendukung filter gudang, rentang tanggal, dan
 * pencarian nomor/catatan/nama/SKU produk.
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
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");
  const search = (searchParams.get("q") || "").trim();
  const limitParam = Number(searchParams.get("limit") || 100);
  const take = Number.isSafeInteger(limitParam)
    ? Math.min(Math.max(limitParam, 1), 200)
    : 100;

  const locationId = locationParam ? Number(locationParam) : null;
  if (locationParam && (!Number.isSafeInteger(locationId) || (locationId ?? 0) <= 0)) {
    return NextResponse.json({ error: "locationId tidak valid" }, { status: 400 });
  }

  const dateFilter: { gte?: Date; lte?: Date } = {};
  if (fromParam) {
    const from = new Date(fromParam);
    if (!Number.isNaN(from.getTime())) dateFilter.gte = from;
  }
  if (toParam) {
    const to = new Date(toParam);
    if (!Number.isNaN(to.getTime())) {
      to.setHours(23, 59, 59, 999);
      dateFilter.lte = to;
    }
  }

  const adjustments = await prisma.stockAdjustment.findMany({
    where: {
      ...(locationId !== null ? { locationId } : {}),
      ...(dateFilter.gte || dateFilter.lte ? { date: dateFilter } : {}),
      ...(search
        ? {
            OR: [
              { no: { contains: search, mode: "insensitive" } },
              { note: { contains: search, mode: "insensitive" } },
              {
                items: {
                  some: {
                    product: {
                      OR: [
                        { name: { contains: search, mode: "insensitive" } },
                        { sku: { contains: search, mode: "insensitive" } },
                      ],
                    },
                  },
                },
              },
            ],
          }
        : {}),
    },
    include: {
      location: { select: { id: true, name: true } },
      items: {
        orderBy: { id: "asc" },
        select: {
          id: true,
          productId: true,
          oldQuantity: true,
          newQuantity: true,
          difference: true,
          product: { select: { id: true, name: true, sku: true } },
        },
      },
    },
    orderBy: [{ date: "desc" }, { id: "desc" }],
    take,
  });

  return NextResponse.json(
    adjustments.map((adjustment) => {
      const increase = adjustment.items.reduce(
        (sum, item) => sum + (item.difference > 0 ? item.difference : 0),
        0
      );
      const decrease = adjustment.items.reduce(
        (sum, item) => sum + (item.difference < 0 ? Math.abs(item.difference) : 0),
        0
      );
      return {
        id: adjustment.id,
        no: adjustment.no,
        date: adjustment.date,
        note: adjustment.note,
        location: adjustment.location,
        itemCount: adjustment.items.length,
        increase,
        decrease,
        net: increase - decrease,
        items: adjustment.items.map((item) => ({
          id: item.id,
          productId: item.productId,
          name: item.product?.name ?? `Produk #${item.productId}`,
          sku: item.product?.sku ?? "-",
          oldQuantity: item.oldQuantity,
          newQuantity: item.newQuantity,
          difference: item.difference,
        })),
      };
    })
  );
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (
    !session?.user?.id ||
    !hasPermission(
      session.user.role,
      session.user.permissions,
      "inventory",
      "create"
    )
  ) {
    return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
  }

  try {
    const { no, date, locationId, note, items } = await req.json();

    if (!locationId || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { message: "Lokasi dan item wajib diisi" },
        { status: 400 }
      );
    }

    const numericLocationId = Number(locationId);
    if (!Number.isSafeInteger(numericLocationId) || numericLocationId <= 0) {
      return NextResponse.json(
        { message: "Lokasi tidak valid" },
        { status: 400 }
      );
    }

    const normalizedItems: NormalizedItem[] = items.map((item: unknown) => {
      const source = (item ?? {}) as Record<string, unknown>;
      const mode: AdjustmentMode =
        source.mode === "add" || source.mode === "subtract"
          ? source.mode
          : "set";
      // `newQuantity` dipertahankan untuk kompatibilitas klien lama.
      const rawValue =
        source.value !== undefined ? source.value : source.newQuantity;
      return {
        productId: Number(source.productId),
        mode,
        value: Number(rawValue),
      };
    });

    if (
      normalizedItems.some(
        (item) =>
          !Number.isSafeInteger(item.productId) ||
          item.productId <= 0 ||
          !Number.isSafeInteger(item.value) ||
          (item.mode === "set" ? item.value < 0 : item.value <= 0)
      )
    ) {
      return NextResponse.json(
        { message: "Produk atau jumlah penyesuaian tidak valid" },
        { status: 400 }
      );
    }

    const adjustmentNo = no || `ADJ-${Date.now()}`;
    const adjustmentDate = date ? new Date(date) : new Date();

    const adjustment = await prisma.$transaction(async (tx) => {
      // Produk bundle tidak punya stok sendiri, jadi tidak bisa disesuaikan.
      const bundleRows = await tx.bom.findMany({
        where: { productId: { in: normalizedItems.map((item) => item.productId) } },
        select: { product: { select: { sku: true, name: true } } },
      });
      if (bundleRows.length > 0) {
        const skus = bundleRows.map((row) => row.product.sku).join(", ");
        throw new InvalidStockError(
          `Produk bundle tidak bisa disesuaikan stoknya (${skus}). Sesuaikan stok komponennya.`
        );
      }

      const createdAdjustment = await tx.stockAdjustment.create({
        data: {
          no: adjustmentNo,
          date: adjustmentDate,
          locationId: numericLocationId,
          note: note || "",
        },
      });

      const adjustmentLinesForAccounting = [];

      for (const item of normalizedItems) {
        const oldQty = await getLocationStockQuantity(
          tx,
          item.productId,
          numericLocationId
        );

        // Mode dihitung di dalam transaksi agar tidak memakai angka stok basi
        // dari klien ketika ada penjualan bersamaan.
        let newQuantity: number;
        if (item.mode === "add") {
          newQuantity = oldQty + item.value;
        } else if (item.mode === "subtract") {
          newQuantity = oldQty - item.value;
          if (newQuantity < 0) {
            throw new InsufficientStockError(
              `Stok tidak cukup untuk dikurangi (tersedia ${oldQty}, diminta ${item.value})`
            );
          }
        } else {
          newQuantity = item.value;
        }

        const difference = newQuantity - oldQty;

        await setStockAtLocation(tx, {
          productId: item.productId,
          locationId: numericLocationId,
          quantity: newQuantity,
        });

        await tx.stockAdjustmentItem.create({
          data: {
            adjustmentId: createdAdjustment.id,
            productId: item.productId,
            oldQuantity: oldQty,
            newQuantity,
            difference,
          },
        });

        adjustmentLinesForAccounting.push({
          productId: item.productId,
          difference,
        });
      }

      // Posting Jurnal Akuntansi Penyesuaian Persediaan
      await processStockAdjustmentAccounting(
        createdAdjustment.id,
        createdAdjustment.no,
        adjustmentDate,
        numericLocationId,
        adjustmentLinesForAccounting,
        tx
      );

      return createdAdjustment;
    }, TRANSACTION_OPTIONS);

    return NextResponse.json({
      message: "Penyesuaian stok berhasil",
      adjustment,
    });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error) {
      if (error.code === "INVALID_STOCK") {
        return NextResponse.json(
          { message: getErrorMessage(error, "Stok tidak valid") },
          { status: 400 }
        );
      }
      if (error.code === "INSUFFICIENT_STOCK") {
        return NextResponse.json(
          { message: getErrorMessage(error, "Stok tidak mencukupi") },
          { status: 409 }
        );
      }
      if (error.code === "P2002") {
        return NextResponse.json(
          { message: "Nomor penyesuaian sudah digunakan" },
          { status: 409 }
        );
      }
    }

    console.error("Error creating adjustment:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}
