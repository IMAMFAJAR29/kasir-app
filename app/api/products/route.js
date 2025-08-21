import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET /api/products
export async function GET() {
  try {
    const products = await prisma.product.findMany({
      include: { category: true },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(products, { status: 200 });
  } catch (err) {
    console.error("Error fetch products:", err);
    // balikin array kosong biar frontend aman
    return NextResponse.json([], { status: 200 });
  }
}

// POST /api/products
export async function POST(req) {
  try {
    const body = await req.json();
    const { name, description, imageUrl, price, categoryId } = body;

    if (!name || !price) {
      return NextResponse.json(
        { error: "Nama dan harga wajib diisi" },
        { status: 400 }
      );
    }

    const parsedPrice = parseFloat(price);
    if (isNaN(parsedPrice)) {
      return NextResponse.json({ error: "Harga tidak valid" }, { status: 400 });
    }

    const newProduct = await prisma.product.create({
      data: {
        name,
        description,
        imageUrl,
        price: parsedPrice,
        categoryId: categoryId ? parseInt(categoryId) : null,
      },
    });

    return NextResponse.json(newProduct, { status: 201 });
  } catch (err) {
    console.error("Error create product:", err);
    return NextResponse.json({ error: "Gagal buat produk" }, { status: 500 });
  }
}

// PUT /api/products
export async function PUT(req) {
  try {
    const body = await req.json();
    const { id, name, description, imageUrl, price, categoryId } = body;

    if (!id) {
      return NextResponse.json(
        { error: "ID produk wajib diisi" },
        { status: 400 }
      );
    }

    const parsedId = parseInt(id);
    if (isNaN(parsedId)) {
      return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
    }

    const parsedPrice = parseFloat(price);
    if (isNaN(parsedPrice)) {
      return NextResponse.json({ error: "Harga tidak valid" }, { status: 400 });
    }

    // Pastikan produk ada sebelum update
    const existing = await prisma.product.findUnique({
      where: { id: parsedId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Produk tidak ditemukan" },
        { status: 404 }
      );
    }

    const updated = await prisma.product.update({
      where: { id: parsedId },
      data: {
        name,
        description,
        imageUrl,
        price: parsedPrice,
        categoryId: categoryId ? parseInt(categoryId) : null,
      },
    });

    return NextResponse.json(updated, { status: 200 });
  } catch (err) {
    console.error("Error update product:", err);
    return NextResponse.json({ error: "Gagal update produk" }, { status: 500 });
  }
}
