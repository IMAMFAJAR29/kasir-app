import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { ProductBody } from "@/types/products";

// =======================
// GET /api/products
// =======================
export async function GET() {
  try {
    const products = await prisma.product.findMany({
      include: { category: true }, // ini penting supaya ada properti category
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(products, { status: 200 });
  } catch (err) {
    console.error("Error fetch products:", err);
    return NextResponse.json([], { status: 500 });
  }
}

// =======================
// POST /api/products
// =======================
export async function POST(req: Request) {
  try {
    const body: ProductBody = await req.json();
    const { name, description, imageUrl, price, categoryId, sku, stock } = body;

    if (!name || !price) {
      return NextResponse.json(
        { error: "Nama dan harga wajib diisi" },
        { status: 400 }
      );
    }

    const parsedPrice = parseFloat(price.toString());
    if (isNaN(parsedPrice)) {
      return NextResponse.json({ error: "Harga tidak valid" }, { status: 400 });
    }

    const parsedStock = stock ? parseInt(stock.toString()) : 0;
    const parsedCategoryId = categoryId
      ? parseInt(categoryId.toString())
      : null;

    // Jika SKU kosong, generate UUID
    let finalSku = sku && sku.trim() !== "" ? sku.trim() : uuidv4();

    // Cek apakah SKU sudah dipakai produk lain
    const existingSku = await prisma.product.findUnique({
      where: { sku: finalSku },
    });
    if (existingSku) {
      return NextResponse.json(
        { error: "SKU sudah digunakan produk lain" },
        { status: 400 }
      );
    }

    const newProduct = await prisma.product.create({
      data: {
        name,
        description,
        imageUrl,
        price: parsedPrice,
        categoryId: parsedCategoryId,
        stock: parsedStock,
        sku: finalSku,
      },
      include: { category: true }, // <- ini tambahan penting
    });

    return NextResponse.json(newProduct, { status: 201 });
  } catch (err: any) {
    console.error("Error create product:", err);
    return NextResponse.json({ error: "Gagal buat produk" }, { status: 500 });
  }
}

// =======================
// PUT /api/products
// =======================
export async function PUT(req: Request) {
  try {
    const body: ProductBody = await req.json();
    const { id, name, description, imageUrl, price, categoryId, sku, stock } =
      body;

    if (!id) {
      return NextResponse.json(
        { error: "ID produk wajib diisi" },
        { status: 400 }
      );
    }

    const parsedId = parseInt(id.toString());
    if (isNaN(parsedId)) {
      return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
    }

    const parsedPrice = parseFloat(price.toString());
    if (isNaN(parsedPrice)) {
      return NextResponse.json({ error: "Harga tidak valid" }, { status: 400 });
    }

    const parsedStock = stock ? parseInt(stock.toString()) : 0;
    const parsedCategoryId = categoryId
      ? parseInt(categoryId.toString())
      : null;

    // Pastikan produk ada
    const existing = await prisma.product.findUnique({
      where: { id: parsedId },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Produk tidak ditemukan" },
        { status: 404 }
      );
    }

    // Jika SKU dikirim dan berbeda dari yang lama, cek apakah sudah dipakai produk lain
    let finalSku = existing.sku;
    if (sku && sku.trim() !== "" && sku !== existing.sku) {
      const conflict = await prisma.product.findUnique({
        where: { sku: sku.trim() },
      });
      if (conflict) {
        return NextResponse.json(
          { error: "SKU sudah digunakan produk lain" },
          { status: 400 }
        );
      }
      finalSku = sku.trim();
    }

    const updated = await prisma.product.update({
      where: { id: parsedId },
      data: {
        name,
        description,
        imageUrl,
        price: parsedPrice,
        categoryId: parsedCategoryId,
        stock: parsedStock,
        sku: finalSku,
      },
      include: { category: true }, // <- ini tambahan penting
    });

    return NextResponse.json(updated, { status: 200 });
  } catch (err: any) {
    console.error("Error update product:", err);
    return NextResponse.json({ error: "Gagal update produk" }, { status: 500 });
  }
}
