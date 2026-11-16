import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { hasPermission } from "@/lib/permissions";
import { buildTree } from "@/lib/categoryTree";

// GET: ambil semua kategori (dalam bentuk tree)
export async function GET() {
  const auth = await getServerSession(authOptions);
  if (!auth?.user?.id) {
    return NextResponse.json({ error: "Autentikasi diperlukan" }, { status: 401 });
  }
  if (!hasPermission(auth.user.role, auth.user.permissions, "categories", "view")) {
    return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
  }
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
  const auth = await getServerSession(authOptions);
  if (!auth?.user?.id) {
    return NextResponse.json({ error: "Autentikasi diperlukan" }, { status: 401 });
  }
  if (!hasPermission(auth.user.role, auth.user.permissions, "categories", "create")) {
    return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
  }
  try {
    const body = await req.json();
    const { name, parentId } = body;
    const normalizedName = typeof name === "string" ? name.trim() : "";

    if (!normalizedName) {
      return NextResponse.json(
        { error: "Nama kategori wajib diisi" },
        { status: 400 }
      );
    }

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
    }

    const newCategory = await prisma.category.create({
      data: {
        name: normalizedName,
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
