import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

//  GET produk berdasarkan ID
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);

    if (isNaN(id)) {
      return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
    }

    const product = await prisma.product.findUnique({
      where: { id },
      include: { category: true },
    });

    if (!product) {
      return NextResponse.json(
        { error: "Produk tidak ditemukan" },
        { status: 404 }
      );
    }

    return NextResponse.json(product, { status: 200 });
  } catch (err) {
    console.error("Error get product:", err);
    return NextResponse.json({ error: "Gagal ambil produk" }, { status: 500 });
  }
}

//  PUT (update produk berdasarkan ID)
export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
    }

    const body = await req.json();
    const { name, description, imageUrl, price, categoryId, sku, stock } = body;

    const parsedPrice = parseFloat(price);
    if (isNaN(parsedPrice)) {
      return NextResponse.json({ error: "Harga tidak valid" }, { status: 400 });
    }

    const parsedStock = stock ? parseInt(stock) : 0;

    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Produk tidak ditemukan" },
        { status: 404 }
      );
    }

    const updated = await prisma.product.update({
      where: { id },
      data: {
        name,
        description,
        imageUrl,
        price: parsedPrice,
        categoryId: categoryId ? parseInt(categoryId) : null,
        stock: parsedStock,
        // kalau sku kosong → pakai yang lama
        sku: sku && sku.trim() !== "" ? sku : existing.sku,
      },
    });

    return NextResponse.json(updated, { status: 200 });
  } catch (err) {
    console.error("Error update product:", err);
    return NextResponse.json({ error: "Gagal update produk" }, { status: 500 });
  }
}

//  DELETE produk berdasarkan ID
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);

    if (isNaN(id)) {
      return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
    }

    await prisma.product.delete({
      where: { id },
    });

    return NextResponse.json(
      { message: "Produk berhasil dihapus" },
      { status: 200 }
    );
  } catch (err) {
    console.error("Error delete product:", err);
    return NextResponse.json({ error: "Gagal hapus produk" }, { status: 500 });
  }
}
