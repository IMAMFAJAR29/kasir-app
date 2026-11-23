import prisma, { TRANSACTION_OPTIONS } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { processStockAdjustmentAccounting } from "@/lib/accounting/adjustmentAccounting";
import { getLocationStockQuantity, setStockAtLocation } from "@/lib/productStock";
import { getErrorMessage } from "@/lib/prismaErrors";

export async function POST(req: NextRequest) {
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

    const normalizedItems = items.map((item: unknown) => {
      const source = (item ?? {}) as Record<string, unknown>;
      return {
        productId: Number(source.productId),
        newQuantity: Number(source.newQuantity),
      };
    });

    if (
      normalizedItems.some(
        (item) =>
          !Number.isSafeInteger(item.productId) ||
          item.productId <= 0 ||
          !Number.isSafeInteger(item.newQuantity) ||
          item.newQuantity < 0
      )
    ) {
      return NextResponse.json(
        { message: "Produk atau stok baru tidak valid" },
        { status: 400 }
      );
    }

    const adjustmentNo = no || `ADJ-${Date.now()}`;
    const adjustmentDate = date ? new Date(date) : new Date();

    const adjustment = await prisma.$transaction(async (tx) => {
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
        const difference = item.newQuantity - oldQty;

        await setStockAtLocation(tx, {
          productId: item.productId,
          locationId: numericLocationId,
          quantity: item.newQuantity,
        });

        await tx.stockAdjustmentItem.create({
          data: {
            adjustmentId: createdAdjustment.id,
            productId: item.productId,
            oldQuantity: oldQty,
            newQuantity: item.newQuantity,
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
    }

    console.error("Error creating adjustment:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}
