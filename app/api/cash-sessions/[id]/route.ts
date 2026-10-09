import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/authOptions";
import prisma from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getServerSession(authOptions);
  if (
    !auth?.user?.id ||
    !hasPermission(
      auth.user.role,
      auth.user.permissions,
      "pos",
      "update"
    )
  ) {
    return NextResponse.json({ error: "Autentikasi diperlukan" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const closingCash = Number(body.closingCash);
  if (!Number.isFinite(closingCash) || closingCash < 0) {
    return NextResponse.json({ error: "Uang fisik tidak valid" }, { status: 400 });
  }

  const where = { id, userId: auth.user.id, closedAt: null };
  const cashSession = await prisma.cashSession.findFirst({ where });
  if (!cashSession) {
    return NextResponse.json(
      { error: "Shift terbuka tidak ditemukan atau bukan milik Anda" },
      { status: 404 }
    );
  }

  const totals = await prisma.sale.aggregate({
    where: { cashSessionId: id, method: "cash" },
    _sum: { payment: true, change: true },
  });
  const expectedCash =
    Number(cashSession.openingCash) +
    Number(totals._sum.payment || 0) -
    Number(totals._sum.change || 0);
  const difference = closingCash - expectedCash;
  const closedAt = new Date();
  const result = await prisma.cashSession.updateMany({
    where,
    data: {
      closingCash,
      closedAt,
      notes: typeof body.notes === "string" ? body.notes.trim() || null : null,
    },
  });

  if (result.count !== 1) {
    return NextResponse.json(
      { error: "Shift sudah ditutup oleh proses lain" },
      { status: 409 }
    );
  }

  return NextResponse.json({
    session: {
      id,
      openingCash: Number(cashSession.openingCash),
      expectedCash,
      closingCash,
      difference,
      closedAt,
    },
  });
}
