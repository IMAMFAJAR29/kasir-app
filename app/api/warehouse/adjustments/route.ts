import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { processStockAdjustmentAccounting } from "@/lib/accounting/adjustmentAccounting";

export async function POST(req: NextRequest) {
  try {
    const { no, date, locationId, note, items } = await req.json();

    if (!locationId || !items || items.length === 0) {
      return NextResponse.json(
        { message: "Lokasi dan item wajib diisi" },
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
          locationId: Number(locationId),
          note: note || "",
        },
      });

      const adjustmentLinesForAccounting = [];

      for (const item of items) {
        const stock = await tx.productStock.findUnique({
          where: {
            productId_locationId: {
              productId: Number(item.productId),
              locationId: Number(locationId),
            },
          },
        });

        const oldQty = stock?.quantity || 0;
        const newQty = Number(item.newQuantity || 0);
        const difference = newQty - oldQty;

        await tx.productStock.upsert({
          where: {
            productId_locationId: {
              productId: Number(item.productId),
              locationId: Number(locationId),
            },
          },
          update: { quantity: newQty },
          create: {
            productId: Number(item.productId),
            locationId: Number(locationId),
            quantity: newQty,
          },
        });

        // Sinkronisasi stok global Product
        await tx.product.update({
          where: { id: Number(item.productId) },
          data: { stock: { increment: difference } },
        });

        await tx.stockAdjustmentItem.create({
          data: {
            adjustmentId: createdAdjustment.id,
            productId: Number(item.productId),
            oldQuantity: oldQty,
            newQuantity: newQty,
            difference,
          },
        });

        adjustmentLinesForAccounting.push({
          productId: Number(item.productId),
          difference,
        });
      }

      // Posting Jurnal Akuntansi Penyesuaian Persediaan
      await processStockAdjustmentAccounting(
        createdAdjustment.id,
        createdAdjustment.no,
        adjustmentDate,
        Number(locationId),
        adjustmentLinesForAccounting,
        tx
      );

      return createdAdjustment;
    });

    return NextResponse.json({
      message: "Penyesuaian stok berhasil",
      adjustment,
    });
  } catch (error) {
    console.error("Error creating adjustment:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}
