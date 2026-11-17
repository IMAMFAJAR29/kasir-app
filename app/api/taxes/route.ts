import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";

// ============================================================
// GET → Ambil semua pajak
// ============================================================
export async function GET() {
  try {
    const taxes = await prisma.tax.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(taxes, { status: 200 });
  } catch (err) {
    console.error("❌ Error get taxes:", err);
    return NextResponse.json(
      { error: "Gagal mengambil daftar pajak" },
      { status: 500 }
    );
  }
}

// ============================================================
// POST → Tambah pajak baru
// ============================================================
export async function POST(req: Request) {
  try {
    const { name, rate, description, isActive = true } = await req.json();

    if (!name || rate == null) {
      return NextResponse.json(
        { error: "Nama dan rate pajak wajib diisi" },
        { status: 400 }
      );
    }

    const tax = await prisma.tax.create({
      data: {
        name,
        rate: new Prisma.Decimal(rate),
        description: description || null,
        isActive,
      },
    });

    return NextResponse.json(tax, { status: 201 });
  } catch (err) {
    console.error("❌ Error create tax:", err);
    return NextResponse.json({ error: "Gagal membuat pajak" }, { status: 500 });
  }
}
