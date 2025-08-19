import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET: Ambil semua kategori
export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: "asc" },
    });
    return NextResponse.json(categories, { status: 200 });
  } catch (error) {
    console.error("❌ Error fetching categories:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data kategori" },
      { status: 500 }
    );
  }
}

// POST: Tambah kategori baru
export async function POST(req) {
  try {
    const body = await req.json();
    const { name, slug } = body;

    // Validasi input
    if (!name || !slug) {
      return NextResponse.json(
        { error: "name & slug wajib diisi" },
        { status: 400 }
      );
    }

    // Buat kategori baru
    const newCategory = await prisma.category.create({
      data: { name, slug },
    });

    return NextResponse.json(newCategory, { status: 201 });
  } catch (error) {
    console.error("❌ Error creating category:", error);
    return NextResponse.json(
      { error: "Gagal menambah kategori" },
      { status: 500 }
    );
  }
}
