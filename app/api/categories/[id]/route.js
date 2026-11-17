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

async function findCategoryByName(name, excludeId = null) {
  return prisma.category.findFirst({
    where: {
      name: { equals: name, mode: "insensitive" },
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { id: true, name: true },
  });
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
  if (
    !hasPermission(auth.user.role, auth.user.permissions, "categories", "delete")
  ) {
    return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
  }

  const id = await parseCategoryId(context);
  if (!id) {
    return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
  }

  try {
    const category = await prisma.category.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        _count: { select: { children: true, products: true } },
      },
    });
    if (!category) {
      return NextResponse.json(
        { error: "Kategori tidak ditemukan" },
        { status: 404 }
      );
    }

    // Jangan biarkan FK Cascade/SetNull menghapus atau melepas data diam-diam.
    if (category._count.children > 0) {
      return NextResponse.json(
        {
          error: `Kategori "${category.name}" masih memiliki ${category._count.children} subkategori. Hapus atau pindahkan subkategori terlebih dahulu.`,
        },
        { status: 409 }
      );
    }
    if (category._count.products > 0) {
      return NextResponse.json(
        {
          error: `Kategori "${category.name}" masih digunakan oleh ${category._count.products} produk. Pindahkan produk ke kategori lain terlebih dahulu.`,
        },
        { status: 409 }
      );
    }

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
  if (
    !hasPermission(auth.user.role, auth.user.permissions, "categories", "update")
  ) {
    return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
  }

  const id = await parseCategoryId(context);
  if (!id) {
    return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
  }

  try {
    const body = await req.json();
    const existing = await prisma.category.findUnique({
      where: { id },
      select: { id: true, name: true, parentId: true },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Kategori tidak ditemukan" },
        { status: 404 }
      );
    }

    const hasParentField = Object.prototype.hasOwnProperty.call(
      body,
      "parentId"
    );
    const hasNameField = Object.prototype.hasOwnProperty.call(body, "name");
    if (!hasParentField && !hasNameField) {
      return NextResponse.json(
        { error: "Tidak ada data kategori yang diubah" },
        { status: 400 }
      );
    }

    const data = {};

    if (hasNameField) {
      const normalizedName =
        typeof body.name === "string" ? body.name.trim() : "";
      if (!normalizedName) {
        return NextResponse.json(
          { error: "Nama kategori tidak boleh kosong" },
          { status: 400 }
        );
      }

      if (
        normalizedName.toLowerCase() !== existing.name.trim().toLowerCase()
      ) {
        const duplicate = await findCategoryByName(normalizedName, id);
        if (duplicate) {
          return NextResponse.json(
            {
              error: `Kategori "${normalizedName}" sudah ada`,
              field: "name",
            },
            { status: 400 }
          );
        }
      }

      data.name = normalizedName;
    }

    // Hanya ubah parentId jika field dikirim. Request rename tanpa parentId
    // tidak boleh membuat kategori menjadi root.
    if (hasParentField) {
      const { parentId } = body;
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
            {
              error:
                "Kategori induk tidak boleh dirinya sendiri atau turunannya",
            },
            { status: 400 }
          );
        }
      }

      data.parentId = normalizedParentId;
    }

    const updatedCategory = await prisma.category.update({
      where: { id },
      data,
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
