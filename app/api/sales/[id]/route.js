import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// ✅ GET detail transaksi
export async function GET(req, { params }) {
  try {
    const { id } = params;

    const sale = await prisma.sale.findUnique({
      where: { id: Number(id) },
      include: { items: { include: { product: true } } },
    });

    if (!sale) {
      return NextResponse.json(
        { error: "Transaksi tidak ditemukan" },
        { status: 404 }
      );
    }

    return NextResponse.json(sale);
  } catch (err) {
    console.error("Error get sale detail:", err);
    return NextResponse.json(
      { error: "Gagal mengambil detail transaksi" },
      { status: 500 }
    );
  }
}

// ✅ DELETE transaksi
export async function DELETE(req, { params }) {
  try {
    const { id } = params;

    await prisma.sale.delete({
      where: { id: Number(id) },
    });

    return NextResponse.json({ message: "Transaksi berhasil dihapus" });
  } catch (err) {
    console.error("Error delete sale:", err);
    return NextResponse.json(
      { error: "Gagal menghapus transaksi" },
      { status: 500 }
    );
  }
}
