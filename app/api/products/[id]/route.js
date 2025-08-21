import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

// ✅ DELETE produk berdasarkan ID
export async function DELETE(req, { params }) {
  try {
    const id = parseInt(params.id);

    if (isNaN(id)) {
      return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
    }

    await prisma.Product.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Produk berhasil dihapus" });
  } catch (err) {
    console.error("Error delete product:", err);
    return NextResponse.json({ error: "Gagal hapus produk" }, { status: 500 });
  }
}
