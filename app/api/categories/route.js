import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { buildTree } from "@/lib/categoryTree";

// GET: ambil semua kategori (dalam bentuk tree)
export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: "asc" },
    });

    const tree = buildTree(categories);
    return NextResponse.json(tree, { status: 200 });
  } catch (error) {
    console.error(" Error fetching categories:", error);
    return NextResponse.json(
      { error: "Gagal mengambil kategori" },
      { status: 500 }
    );
  }
}

// POST: tambah kategori baru
export async function POST(req) {
  try {
    const body = await req.json();
    const { name, parentId } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Name wajib diisi" },
        { status: 400 } // ✅ 400 Bad Request
      );
    }

    const newCategory = await prisma.category.create({
      data: {
        name,
        parentId: parentId || null,
      },
    });

    return NextResponse.json(newCategory, { status: 201 }); // ✅ 201 Created
  } catch (error) {
    console.error("Error creating category:", error);
    return NextResponse.json(
      { error: "Gagal membuat kategori" },
      { status: 500 }
    );
  }
}
