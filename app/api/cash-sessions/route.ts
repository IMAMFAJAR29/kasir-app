import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/authOptions";
import prisma from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { canAccessLocation, loadRegisterContext } from "@/lib/posAccess";

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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Data permintaan tidak valid" }, { status: 400 });
  }
  const source = (body ?? {}) as Record<string, unknown>;
  const openingCash = Number(source.openingCash);
  if (!Number.isFinite(openingCash) || openingCash < 0) {
    return NextResponse.json({ error: "Modal awal tidak valid" }, { status: 400 });
  }

  // registerId opsional untuk kompatibilitas, tetapi Cashier Back Office
  // selalu mengirimkannya. Tanpa register, shift memakai konteks lama.
  const registerId =
    source.registerId === undefined || source.registerId === null
      ? null
      : Number(source.registerId);
  if (registerId !== null && (!Number.isSafeInteger(registerId) || registerId <= 0)) {
    return NextResponse.json({ error: "Mesin kasir tidak valid" }, { status: 400 });
  }

  let locationId: number | null = null;
  let warehouseId: number | null = null;

  if (registerId !== null) {
    const register = await loadRegisterContext(prisma, registerId);
    if (!register) {
      return NextResponse.json({ error: "Mesin kasir tidak ditemukan" }, { status: 404 });
    }
    if (!register.isActive) {
      return NextResponse.json({ error: "Mesin kasir tidak aktif" }, { status: 409 });
    }
    if (!register.location.isActive || !register.warehouse.isActive) {
      return NextResponse.json(
        { error: "Outlet atau gudang mesin kasir tidak aktif" },
        { status: 409 }
      );
    }
    if (
      !(await canAccessLocation(
        prisma,
        auth.user.id,
        auth.user.role,
        register.locationId
      ))
    ) {
      return NextResponse.json(
        { error: "Anda tidak memiliki akses ke outlet mesin ini" },
        { status: 403 }
      );
    }

    // Mesin hanya boleh dipakai satu kasir pada satu waktu.
    const occupied = await prisma.cashSession.findFirst({
      where: { registerId, closedAt: null },
      select: { id: true, userId: true, user: { select: { name: true } } },
    });
    if (occupied) {
      if (occupied.userId === auth.user.id) {
        return NextResponse.json(
          {
            error: "Anda sudah membuka shift di mesin ini",
            sessionId: occupied.id,
          },
          { status: 409 }
        );
      }
      return NextResponse.json(
        {
          error: `Mesin kasir sedang digunakan oleh ${occupied.user.name}`,
        },
        { status: 409 }
      );
    }

    locationId = register.locationId;
    warehouseId = register.warehouseId;
  }

  try {
    const cashSession = await prisma.cashSession.create({
      data: {
        userId: auth.user.id,
        openingCash,
        registerId,
        locationId,
        warehouseId,
      },
    });

    return NextResponse.json(
      {
        session: {
          id: cashSession.id,
          openingCash: Number(cashSession.openingCash),
          openedAt: cashSession.openedAt,
          expectedCash: Number(cashSession.openingCash),
          registerId: cashSession.registerId,
          locationId: cashSession.locationId,
          warehouseId: cashSession.warehouseId,
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
        {
          error: registerId
            ? "Shift Anda masih terbuka di mesin lain. Tutup shift tersebut sebelum membuka kasir di mesin ini."
            : "Anda sudah memiliki shift kasir yang masih terbuka",
        },
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
    include: {
      user: { select: { id: true, name: true, email: true } },
      register: { select: { id: true, name: true, code: true } },
      location: { select: { id: true, name: true } },
    },
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
        register: cashSession.register,
        location: cashSession.location,
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
