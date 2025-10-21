import prisma from "@/lib/prisma";
import { NextRequest } from "next/server";

// ============================
// PUT → Update lokasi (nama, alamat, isActive)
// ============================
export async function PUT(req: NextRequest) {
  try {
    // Ambil ID dari URL
    const url = new URL(req.url);
    const parts = url.pathname.split("/");
    const id = Number(parts[parts.length - 1]);

    if (isNaN(id)) {
      return new Response("ID tidak valid", { status: 400 });
    }

    const data = await req.json();

    const updatedLocation = await prisma.location.update({
      where: { id },
      data,
    });

    return new Response(JSON.stringify(updatedLocation), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Gagal update lokasi:", error);
    return new Response("Gagal update lokasi", { status: 500 });
  }
}

// ============================
// DELETE → Hapus lokasi (cek stok & transaksi)
// ============================
export async function DELETE(req: NextRequest) {
  try {
    // Ambil ID dari URL
    const url = new URL(req.url);
    const parts = url.pathname.split("/");
    const id = Number(parts[parts.length - 1]);

    if (isNaN(id)) {
      return new Response("ID tidak valid", { status: 400 });
    }

    // Cek stok produk > 0
    const stockCount = await prisma.productStock.count({
      where: { locationId: id, quantity: { gt: 0 } },
    });

    if (stockCount > 0) {
      return new Response("Maaf, gudang sudah ada stok, tidak bisa dihapus", {
        status: 400,
      });
    }

    // Cek transaksi
    const saleCount = await prisma.sale.count({
      where: { locationId: id },
    });

    if (saleCount > 0) {
      return new Response(
        "Maaf, gudang sudah ada transaksi, tidak bisa dihapus",
        { status: 400 }
      );
    }

    // Hapus lokasi
    await prisma.location.delete({ where: { id } });

    return new Response(
      JSON.stringify({ message: "Lokasi berhasil dihapus" }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Gagal menghapus lokasi:", error);
    return new Response("Gagal menghapus lokasi", { status: 500 });
  }
}
