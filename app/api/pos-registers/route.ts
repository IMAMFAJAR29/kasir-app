import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/authOptions";
import prisma from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { getAllowedLocationIds } from "@/lib/posAccess";

const registerInclude = {
  location: { select: { id: true, name: true } },
  warehouse: { select: { id: true, name: true } },
  cashSessions: {
    where: { closedAt: null },
    orderBy: { openedAt: "desc" as const },
    take: 1,
    select: {
      id: true,
      openedAt: true,
      openingCash: true,
      user: { select: { id: true, name: true, email: true } },
    },
  },
} as const;

// GET /api/pos-registers?locationId=1
// Daftar mesin kasir beserta status pemakaian (shift terbuka) dan gudangnya.
export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (
    !session?.user?.id ||
    !hasPermission(session.user.role, session.user.permissions, "pos", "view")
  ) {
    return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const locationParam = searchParams.get("locationId");
  const locationId = locationParam ? Number(locationParam) : null;
  if (locationParam && (!Number.isSafeInteger(locationId) || (locationId ?? 0) <= 0)) {
    return NextResponse.json({ error: "locationId tidak valid" }, { status: 400 });
  }

  const allowed = await getAllowedLocationIds(prisma, session.user.id);
  if (locationId !== null && allowed !== null && !allowed.includes(locationId)) {
    return NextResponse.json(
      { error: "Anda tidak memiliki akses ke outlet ini" },
      { status: 403 }
    );
  }

  const registers = await prisma.posRegister.findMany({
    where: {
      ...(locationId !== null ? { locationId } : {}),
      ...(allowed !== null ? { locationId: { in: allowed } } : {}),
    },
    include: registerInclude,
    orderBy: [{ locationId: "asc" }, { name: "asc" }],
  });

  return NextResponse.json(
    registers.map((register) => {
      const activeSession = register.cashSessions[0] ?? null;
      return {
        id: register.id,
        name: register.name,
        code: register.code,
        isActive: register.isActive,
        location: register.location,
        warehouse: register.warehouse,
        activeSession: activeSession
          ? {
              id: activeSession.id,
              openedAt: activeSession.openedAt,
              openingCash: Number(activeSession.openingCash),
              cashier: activeSession.user,
            }
          : null,
      };
    })
  );
}

// POST /api/pos-registers
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  // Konfigurasi mesin kasir adalah wewenang administrator (pemilik sistem
  // atau pengelola gudang), bukan kasir.
  const canManage =
    session?.user?.id &&
    session.user.role === "ADMIN" &&
    (hasPermission(
      session.user.role,
      session.user.permissions,
      "systemSettings",
      "create"
    ) ||
      hasPermission(
        session.user.role,
        session.user.permissions,
        "warehouses",
        "create"
      ));
  if (!canManage) {
    return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Data permintaan tidak valid" }, { status: 400 });
  }
  const source = (body ?? {}) as Record<string, unknown>;
  const name = typeof source.name === "string" ? source.name.trim() : "";
  const code = typeof source.code === "string" ? source.code.trim().toUpperCase() : "";
  const locationId = Number(source.locationId);
  const warehouseId = Number(source.warehouseId);

  if (!name) {
    return NextResponse.json({ error: "Nama mesin kasir wajib diisi" }, { status: 400 });
  }
  if (!code) {
    return NextResponse.json({ error: "Kode mesin kasir wajib diisi" }, { status: 400 });
  }
  if (!Number.isSafeInteger(locationId) || locationId <= 0) {
    return NextResponse.json({ error: "Outlet tidak valid" }, { status: 400 });
  }
  if (!Number.isSafeInteger(warehouseId) || warehouseId <= 0) {
    return NextResponse.json({ error: "Gudang stok tidak valid" }, { status: 400 });
  }

  const allowed = await getAllowedLocationIds(prisma, session.user.id);
  if (allowed !== null && !allowed.includes(locationId)) {
    return NextResponse.json(
      { error: "Anda tidak memiliki akses ke outlet ini" },
      { status: 403 }
    );
  }

  const [outlet, warehouse] = await Promise.all([
    prisma.location.findUnique({ where: { id: locationId }, select: { id: true } }),
    prisma.location.findUnique({ where: { id: warehouseId }, select: { id: true } }),
  ]);
  if (!outlet) {
    return NextResponse.json({ error: "Outlet tidak ditemukan" }, { status: 400 });
  }
  if (!warehouse) {
    return NextResponse.json({ error: "Gudang tidak ditemukan" }, { status: 400 });
  }

  try {
    const register = await prisma.posRegister.create({
      data: { name, code, locationId, warehouseId },
      include: registerInclude,
    });
    return NextResponse.json(register, { status: 201 });
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "Kode mesin kasir sudah dipakai di outlet ini" },
        { status: 409 }
      );
    }
    console.error("Gagal membuat mesin kasir:", error);
    return NextResponse.json({ error: "Gagal membuat mesin kasir" }, { status: 500 });
  }
}
