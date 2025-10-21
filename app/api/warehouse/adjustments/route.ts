import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

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

    const adjustment = await prisma.stockAdjustment.create({
      data: {
        no: adjustmentNo,
        date: date ? new Date(date) : new Date(),
        locationId,
        note: note || "",
      },
    });

    for (const item of items) {
      const stock = await prisma.productStock.findUnique({
        where: {
          productId_locationId: { productId: item.productId, locationId },
        },
      });

      const oldQty = stock?.quantity || 0;

      await prisma.productStock.upsert({
        where: {
          productId_locationId: { productId: item.productId, locationId },
        },
        update: { quantity: item.newQuantity },
        create: {
          productId: item.productId,
          locationId,
          quantity: item.newQuantity,
        },
      });

      await prisma.stockAdjustmentItem.create({
        data: {
          adjustmentId: adjustment.id,
          productId: item.productId,
          oldQuantity: oldQty,
          newQuantity: item.newQuantity,
          difference: item.newQuantity - oldQty,
        },
      });
    }

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
