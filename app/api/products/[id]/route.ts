import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { hasPermission } from "@/lib/permissions";

//  GET produk berdasarkan ID
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const auth = await getServerSession(authOptions);
  if (!auth?.user?.id) {
    return NextResponse.json({ error: "Autentikasi diperlukan" }, { status: 401 });
  }
  if (!hasPermission(auth.user.role, auth.user.permissions, "products", "view")) {
    return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
  }
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
  const auth = await getServerSession(authOptions);
  if (!auth?.user?.id) {
    return NextResponse.json({ error: "Autentikasi diperlukan" }, { status: 401 });
  }
  if (!hasPermission(auth.user.role, auth.user.permissions, "products", "update")) {
    return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
  }
  try {
    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
    }

    const body = await req.json();
    const { name, description, imageUrl, price, categoryId, sku, stock, barcode } = body;

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

    // Barcode normalisasi + keunikan
    let finalBarcode = existing.barcode;
    if (barcode !== undefined) {
      const normalized =
        barcode && String(barcode).trim() !== "" ? String(barcode).trim() : null;
      if (normalized !== existing.barcode && normalized) {
        const conflict = await prisma.product.findUnique({
          where: { barcode: normalized },
        });
        if (conflict && conflict.id !== id) {
          return NextResponse.json(
            { error: "Barcode sudah digunakan produk lain" },
            { status: 400 }
          );
        }
      }
      finalBarcode = normalized;
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
        barcode: finalBarcode,
      },
    });

    return NextResponse.json(updated, { status: 200 });
  } catch (err: any) {
    if (err?.code === "P2002") {
      const target = Array.isArray(err?.meta?.target)
        ? err.meta.target.join(",")
        : String(err?.meta?.target || "");
      if (target.includes("barcode")) {
        return NextResponse.json(
          { error: "Barcode sudah digunakan produk lain" },
          { status: 400 }
        );
      }
    }
    console.error("Error update product:", err);
    return NextResponse.json({ error: "Gagal update produk" }, { status: 500 });
  }
}

//  DELETE produk berdasarkan ID
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const auth = await getServerSession(authOptions);
  if (!auth?.user?.id) {
    return NextResponse.json({ error: "Autentikasi diperlukan" }, { status: 401 });
  }
  if (!hasPermission(auth.user.role, auth.user.permissions, "products", "delete")) {
    return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
  }
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
