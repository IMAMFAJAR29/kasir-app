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

// ============================================================
// PATCH → Update pajak
// ============================================================
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = Number(params.id);
    const { name, rate, description, isActive } = await req.json();

    const tax = await prisma.tax.update({
      where: { id },
      data: {
        name,
        rate: rate != null ? new Prisma.Decimal(rate) : undefined,
        description,
        isActive,
      },
    });

    return NextResponse.json(tax, { status: 200 });
  } catch (err) {
    console.error("❌ Error update tax:", err);
    return NextResponse.json({ error: "Gagal update pajak" }, { status: 500 });
  }
}

// ============================================================
// DELETE → Hapus pajak jika tidak ada invoice terkait
// ============================================================
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = Number(params.id);

    const relatedInvoices = await prisma.invoice.count({
      where: { taxId: id },
    });
    if (relatedInvoices > 0) {
      return NextResponse.json(
        { error: "Pajak terkait invoice, tidak bisa dihapus" },
        { status: 400 }
      );
    }

    await prisma.tax.delete({ where: { id } });
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error("❌ Error delete tax:", err);
    return NextResponse.json({ error: "Gagal hapus pajak" }, { status: 500 });
  }
}
