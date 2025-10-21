import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req, { params }) {
  try {
    const { id } = params;
    const sale = await prisma.sale.findUnique({
      where: { id: Number(id) },
      include: {
        items: { include: { product: true } },
        invoice: true,
      },
    });

    if (!sale) {
      return NextResponse.json(
        { error: "Data tidak ditemukan" },
        { status: 404 }
      );
    }

    return NextResponse.json(sale);
  } catch (err) {
    console.error("❌ Gagal ambil laporan:", err);
    return NextResponse.json({ error: "Gagal ambil laporan" }, { status: 500 });
  }
}
