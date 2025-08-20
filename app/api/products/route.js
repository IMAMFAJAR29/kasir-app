import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const products = await prisma.Product.findMany({
      include: { category: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(products);
  } catch (err) {
    console.error("Error fetch products:", err);
    return NextResponse.json({ error: "Gagal ambil produk" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { name, description, imageUrl, price, categoryId } = body;

    const newProduct = await prisma.Product.create({
      data: {
        name,
        description,
        imageUrl,
        price: parseFloat(price),
        categoryId: categoryId ? parseInt(categoryId) : null,
      },
    });

    return NextResponse.json(newProduct, { status: 201 });
  } catch (err) {
    console.error("Error create product:", err);
    return NextResponse.json({ error: "Gagal buat produk" }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const body = await req.json();
    const { id, name, description, imageUrl, price, categoryId } = body;

    const updated = await prisma.Product.update({
      where: { id: parseInt(id) },
      data: {
        name,
        description,
        imageUrl,
        price: parseFloat(price),
        categoryId: categoryId ? parseInt(categoryId) : null,
      },
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error("Error update product:", err);
    return NextResponse.json({ error: "Gagal update produk" }, { status: 500 });
  }
}
