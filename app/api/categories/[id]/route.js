import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

// DELETE kategori by ID
export async function DELETE(req, { params }) {
  try {
    await prisma.category.delete({
      where: { id: Number(params.id) },
    });

    return NextResponse.json(
      { message: "Kategori berhasil dihapus" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting category:", error);
    return NextResponse.json(
      { error: "Gagal menghapus kategori" },
      { status: 500 }
    );
  }
}

// UPDATE kategori by ID
export async function PUT(req, { params }) {
  try {
    const body = await req.json();
    const { name, parentId } = body;

    const updatedCategory = await prisma.category.update({
      where: { id: Number(params.id) },
      data: {
        ...(name && { name }),
        parentId: parentId ?? null, // null = jadi root
      },
    });

    return NextResponse.json(updatedCategory, { status: 200 });
  } catch (error) {
    console.error("Error updating category:", error);
    return NextResponse.json(
      { error: "Gagal update kategori" },
      { status: 500 }
    );
  }
}
