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
      return NextResponse.json({ error: "Name wajib diisi" }, { status: 400 });
    }

    const normalizedParentId =
      parentId === null || parentId === undefined || parentId === ""
        ? null
        : Number(parentId);

    if (parentId !== null && parentId !== undefined && parentId !== "" && Number.isNaN(normalizedParentId)) {
      return NextResponse.json(
        { error: "Parent ID tidak valid" },
        { status: 400 }
      );
    }

    const newCategory = await prisma.category.create({
      data: {
        name,
        parentId: normalizedParentId,
      },
    });

    return NextResponse.json(newCategory, { status: 201 });
  } catch (error) {
    console.error("Error creating category:", error);
    return NextResponse.json(
      { error: "Gagal membuat kategori" },
      { status: 500 }
    );
  }
}
