import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET: Ambil semua kategori
export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: "asc" },
    });

    // 🔑 Tambahan: pastikan selalu return array (walau kosong)
    return NextResponse.json(categories ?? [], { status: 200 });
  } catch (error) {
    console.error("❌ Error fetching categories:", error);

    // 🔑 Sebelumnya kamu return object { error: ... }
    // ini bikin categories jadi object, bukan array.
    // Jadi amanin supaya tetap array + flag error.
    return NextResponse.json([], { status: 500 });
  }
}

// POST: Tambah kategori baru
export async function POST(req) {
  try {
    const body = await req.json();
    const { name, slug } = body;

    // Validasi input
    if (!name || !slug) {
      // 🔑 Sama: return object error bikin .map() error
      // solusinya tetap return array kosong di error case
      return NextResponse.json([], { status: 400 });
    }

    // Buat kategori baru
    const newCategory = await prisma.category.create({
      data: { name, slug },
    });

    return NextResponse.json(newCategory, { status: 201 });
  } catch (error) {
    console.error("❌ Error creating category:", error);

    return NextResponse.json([], { status: 500 });
  }
}
