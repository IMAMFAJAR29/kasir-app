import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/authOptions";
import prisma from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";

export async function POST(request: Request) {
  const auth = await getServerSession(authOptions);
  if (
    !auth?.user?.id ||
    !hasPermission(
      auth.user.role,
      auth.user.permissions,
      "pos",
      "create"
    )
  ) {
    return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
  }

  const body = await request.json();
  const openingCash = Number(body.openingCash);
  if (!Number.isFinite(openingCash) || openingCash < 0) {
    return NextResponse.json({ error: "Modal awal tidak valid" }, { status: 400 });
  }

  try {
    const cashSession = await prisma.cashSession.create({
      data: {
        userId: auth.user.id,
        openingCash,
      },
    });

    return NextResponse.json(
      {
        session: {
          id: cashSession.id,
          openingCash: Number(cashSession.openingCash),
          openedAt: cashSession.openedAt,
          expectedCash: Number(cashSession.openingCash),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "Anda sudah memiliki shift kasir yang masih terbuka" },
        { status: 409 }
      );
    }
    console.error("Gagal membuka shift kasir:", error);
    return NextResponse.json({ error: "Gagal membuka shift kasir" }, { status: 500 });
  }
}

export async function GET() {
  const auth = await getServerSession(authOptions);
  if (
    !auth?.user?.id ||
    !hasPermission(
      auth.user.role,
      auth.user.permissions,
      "cashReconciliation",
      "view"
    )
  ) {
    return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
  }

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const sessions = await prisma.cashSession.findMany({
    where: {
      OR: [
        { closedAt: null },
        { closedAt: { gte: startOfToday } },
      ],
    },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { openedAt: "desc" },
    take: 100,
  });

  const totals = sessions.length
    ? await prisma.sale.groupBy({
        by: ["cashSessionId"],
        where: {
          cashSessionId: { in: sessions.map((item) => item.id) },
          method: "cash",
        },
        _sum: { payment: true, change: true },
      })
    : [];

  return NextResponse.json(
    sessions.map((cashSession) => {
      const salesTotal = totals.find(
        (item) => item.cashSessionId === cashSession.id
      );
      const expectedCash =
        Number(cashSession.openingCash) +
        Number(salesTotal?._sum.payment || 0) -
        Number(salesTotal?._sum.change || 0);
      return {
        id: cashSession.id,
        cashier: cashSession.user,
        openingCash: Number(cashSession.openingCash),
        expectedCash,
        closingCash:
          cashSession.closingCash === null
            ? null
            : Number(cashSession.closingCash),
        difference:
          cashSession.closingCash === null
            ? null
            : Number(cashSession.closingCash) - expectedCash,
        openedAt: cashSession.openedAt,
        closedAt: cashSession.closedAt,
        notes: cashSession.notes,
      };
    })
  );
}
