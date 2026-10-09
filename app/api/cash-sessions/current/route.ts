import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/authOptions";
import prisma from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (
    !session?.user?.id ||
    !hasPermission(
      session.user.role,
      session.user.permissions,
      "pos",
      "view"
    )
  ) {
    return NextResponse.json({ error: "Autentikasi diperlukan" }, { status: 401 });
  }

  const cashSession = await prisma.cashSession.findFirst({
    where: { userId: session.user.id, closedAt: null },
    orderBy: { openedAt: "desc" },
  });

  if (!cashSession) return NextResponse.json({ session: null });

  const cashTotals = await prisma.sale.aggregate({
    where: { cashSessionId: cashSession.id, method: "cash" },
    _sum: { payment: true, change: true },
  });
  const expectedCash =
    Number(cashSession.openingCash) +
    Number(cashTotals._sum.payment || 0) -
    Number(cashTotals._sum.change || 0);

  return NextResponse.json({
    session: {
      id: cashSession.id,
      openingCash: Number(cashSession.openingCash),
      openedAt: cashSession.openedAt,
      expectedCash,
    },
  });
}
