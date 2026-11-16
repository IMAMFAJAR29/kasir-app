import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { hasPermission } from "@/lib/permissions";
import { mapPrismaError } from "@/lib/prismaErrors";

async function parseCategoryId(context) {
  const { id } = await context.params;
  const parsed = Number(id);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

async function wouldCreateCycle(categoryId, parentId) {
  if (parentId === null) return false;
  if (parentId === categoryId) return true;

  const categories = await prisma.category.findMany({
    select: { id: true, parentId: true },
  });
  const parentById = new Map(
    categories.map((category) => [category.id, category.parentId])
  );

  let cursor = parentId;
  const visited = new Set();
  while (cursor !== null && cursor !== undefined) {
    if (cursor === categoryId) return true;
    if (visited.has(cursor)) return true;
    visited.add(cursor);
    cursor = parentById.get(cursor) ?? null;
  }
  return false;
}

// DELETE kategori by ID
export async function DELETE(req, context) {
  const auth = await getServerSession(authOptions);
  if (!auth?.user?.id) {
    return NextResponse.json(
      { error: "Autentikasi diperlukan" },
      { status: 401 }
    );
  }
  if (!hasPermission(auth.user.role, auth.user.permissions, "categories", "delete")) {
    return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
  }

  const id = await parseCategoryId(context);
  if (!id) {
    return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
  }

  try {
    await prisma.category.delete({ where: { id } });
    return NextResponse.json(
      { message: "Kategori berhasil dihapus" },
      { status: 200 }
    );
  } catch (error) {
    const mapped = mapPrismaError(error);
    if (mapped?.status === 404) {
      return NextResponse.json(
        { error: "Kategori tidak ditemukan" },
        { status: 404 }
      );
    }
    if (mapped) {
      return NextResponse.json(
        { error: "Kategori tidak dapat dihapus karena masih digunakan" },
        { status: 409 }
      );
    }

    console.error("Error deleting category:", error);
    return NextResponse.json(
      { error: "Gagal menghapus kategori" },
      { status: 500 }
    );
  }
}

// UPDATE kategori by ID
export async function PUT(req, context) {
  const auth = await getServerSession(authOptions);
  if (!auth?.user?.id) {
    return NextResponse.json(
      { error: "Autentikasi diperlukan" },
      { status: 401 }
    );
  }
  if (!hasPermission(auth.user.role, auth.user.permissions, "categories", "update")) {
    return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
  }

  const id = await parseCategoryId(context);
  if (!id) {
    return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
  }

  try {
    const body = await req.json();
    const { name, parentId } = body;

    const normalizedParentId =
      parentId === null || parentId === undefined || parentId === ""
        ? null
        : Number(parentId);

    if (
      parentId !== null &&
      parentId !== undefined &&
      parentId !== "" &&
      !Number.isSafeInteger(normalizedParentId)
    ) {
      return NextResponse.json(
        { error: "Parent ID tidak valid" },
        { status: 400 }
      );
    }

    if (name !== undefined && String(name).trim() === "") {
      return NextResponse.json(
        { error: "Nama kategori tidak boleh kosong" },
        { status: 400 }
      );
    }

    if (normalizedParentId !== null) {
      const parent = await prisma.category.findUnique({
        where: { id: normalizedParentId },
        select: { id: true },
      });
      if (!parent) {
        return NextResponse.json(
          { error: "Kategori induk tidak ditemukan" },
          { status: 400 }
        );
      }
      if (await wouldCreateCycle(id, normalizedParentId)) {
        return NextResponse.json(
          { error: "Kategori induk tidak boleh dirinya sendiri atau turunannya" },
          { status: 400 }
        );
      }
    }

    const updatedCategory = await prisma.category.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name: String(name).trim() } : {}),
        parentId: normalizedParentId,
      },
    });

    return NextResponse.json(updatedCategory, { status: 200 });
  } catch (error) {
    const mapped = mapPrismaError(error);
    if (mapped) {
      return NextResponse.json(
        {
          error:
            mapped.status === 404
              ? "Kategori tidak ditemukan"
              : mapped.message,
        },
        { status: mapped.status }
      );
    }

    console.error("Error updating category:", error);
    return NextResponse.json(
      { error: "Gagal update kategori" },
      { status: 500 }
    );
  }
}
