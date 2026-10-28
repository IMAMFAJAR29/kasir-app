import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { hasPermission } from "@/lib/permissions";

// DELETE kategori by ID
export async function DELETE(req, { params }) {
  const auth = await getServerSession(authOptions);
  if (!auth?.user?.id) {
    return NextResponse.json({ error: "Autentikasi diperlukan" }, { status: 401 });
  }
  if (!hasPermission(auth.user.role, auth.user.permissions, "categories", "delete")) {
    return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
  }
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
  const auth = await getServerSession(authOptions);
  if (!auth?.user?.id) {
    return NextResponse.json({ error: "Autentikasi diperlukan" }, { status: 401 });
  }
  if (!hasPermission(auth.user.role, auth.user.permissions, "categories", "update")) {
    return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
  }
  try {
    const body = await req.json();
    const { name, parentId } = body;

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

    const updatedCategory = await prisma.category.update({
      where: { id: Number(params.id) },
      data: {
        ...(name && { name }),
        parentId: normalizedParentId,
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
