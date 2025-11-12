import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// ✅ GET: Ambil detail 1 purchase
export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const purchase = await prisma.purchase.findUnique({
      where: { id: Number(id) },
      include: {
        supplier: { select: { name: true, phone: true, address: true } },
        location: { select: { name: true } },
        items: {
          include: { product: { select: { name: true, sku: true } } },
        },
      },
    });

    if (!purchase) {
      return NextResponse.json(
        { error: "Data pembelian tidak ditemukan" },
        { status: 404 }
      );
    }

    return NextResponse.json(purchase, { status: 200 });
  } catch (err) {
    console.error("❌ Error get purchase detail:", err);
    return NextResponse.json(
      { error: "Gagal mengambil detail pembelian" },
      { status: 500 }
    );
  }
}

// ✅ DELETE: Hapus purchase
export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    // Hapus item-item purchase dulu (jika relasi)
    await prisma.purchaseItem.deleteMany({
      where: { purchaseId: Number(id) },
    });

    // Lalu hapus purchase utamanya
    await prisma.purchase.delete({
      where: { id: Number(id) },
    });

    return NextResponse.json({ message: "Data pembelian berhasil dihapus" });
  } catch (err) {
    console.error("❌ Error delete purchase:", err);
    return NextResponse.json(
      { error: "Gagal menghapus data pembelian" },
      { status: 500 }
    );
  }
}
