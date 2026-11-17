import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { mapPrismaError } from "@/lib/prismaErrors";

type RouteContext = { params: Promise<{ id: string }> };

async function parseTaxId(context: RouteContext): Promise<number | null> {
  const { id } = await context.params;
  const parsed = Number(id);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

// ============================================================
// PATCH → Update pajak
// ============================================================
export async function PATCH(req: Request, context: RouteContext) {
  const id = await parseTaxId(context);
  if (!id) {
    return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
  }

  try {
    const { name, rate, description, isActive } = await req.json();

    const tax = await prisma.tax.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(rate != null ? { rate: new Prisma.Decimal(rate) } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(isActive !== undefined ? { isActive } : {}),
      },
    });

    return NextResponse.json(tax, { status: 200 });
  } catch (err) {
    const mapped = mapPrismaError(err);
    if (mapped) {
      return NextResponse.json(
        {
          error:
            mapped.status === 404 ? "Pajak tidak ditemukan" : mapped.message,
        },
        { status: mapped.status }
      );
    }

    console.error("❌ Error update tax:", err);
    return NextResponse.json({ error: "Gagal update pajak" }, { status: 500 });
  }
}

// ============================================================
// DELETE → Hapus pajak jika tidak ada invoice terkait
// ============================================================
export async function DELETE(req: Request, context: RouteContext) {
  const id = await parseTaxId(context);
  if (!id) {
    return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
  }

  try {
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
    const mapped = mapPrismaError(err);
    if (mapped) {
      return NextResponse.json(
        {
          error:
            mapped.status === 404 ? "Pajak tidak ditemukan" : mapped.message,
        },
        { status: mapped.status }
      );
    }

    console.error("❌ Error delete tax:", err);
    return NextResponse.json({ error: "Gagal hapus pajak" }, { status: 500 });
  }
}
