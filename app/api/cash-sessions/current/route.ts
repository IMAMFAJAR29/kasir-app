import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/authOptions";
import prisma from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";

export async function GET(request: Request) {
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

  // Back Office meneruskan registerId agar POS hanya menerima shift yang
  // benar-benar dibuka di mesin tersebut.
  const { searchParams } = new URL(request.url);
  const registerParam = searchParams.get("registerId");
  const registerId = registerParam ? Number(registerParam) : null;
  if (registerParam && (!Number.isSafeInteger(registerId) || (registerId ?? 0) <= 0)) {
    return NextResponse.json({ error: "registerId tidak valid" }, { status: 400 });
  }

  const cashSession = await prisma.cashSession.findFirst({
    where: {
      userId: session.user.id,
      closedAt: null,
      ...(registerId !== null ? { registerId } : {}),
    },
    orderBy: { openedAt: "desc" },
    include: {
      register: { select: { id: true, name: true, code: true } },
      location: { select: { id: true, name: true } },
      warehouse: { select: { id: true, name: true } },
    },
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
      registerId: cashSession.registerId,
      locationId: cashSession.locationId,
      warehouseId: cashSession.warehouseId,
      register: cashSession.register,
      location: cashSession.location,
      warehouse: cashSession.warehouse,
    },
  });
}
