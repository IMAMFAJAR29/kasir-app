import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/authOptions";
import prisma from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { canAccessLocation } from "@/lib/posAccess";

// GET /api/pos-registers/[id]
// Detail mesin kasir + riwayat aktivitas terakhir (shift & transaksi).
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (
    !session?.user?.id ||
    !hasPermission(session.user.role, session.user.permissions, "pos", "view")
  ) {
    return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
  }

  const { id } = await params;
  const registerId = Number(id);
  if (!Number.isSafeInteger(registerId) || registerId <= 0) {
    return NextResponse.json({ error: "Mesin kasir tidak valid" }, { status: 400 });
  }

  const register = await prisma.posRegister.findUnique({
    where: { id: registerId },
    include: {
      location: { select: { id: true, name: true } },
      warehouse: { select: { id: true, name: true } },
      cashSessions: {
        orderBy: { openedAt: "desc" },
        take: 5,
        select: {
          id: true,
          openedAt: true,
          closedAt: true,
          openingCash: true,
          closingCash: true,
          user: { select: { id: true, name: true } },
        },
      },
    },
  });
  if (!register) {
    return NextResponse.json({ error: "Mesin kasir tidak ditemukan" }, { status: 404 });
  }
  if (!(await canAccessLocation(prisma, session.user.id, session.user.role, register.locationId))) {
    return NextResponse.json(
      { error: "Anda tidak memiliki akses ke outlet mesin ini" },
      { status: 403 }
    );
  }

  const recentSales = await prisma.sale.findMany({
    where: { cashSession: { registerId } },
    orderBy: { createdAt: "desc" },
    take: 5,
    select: {
      id: true,
      total: true,
      method: true,
      createdAt: true,
      cashSession: {
        select: { user: { select: { id: true, name: true } } },
      },
    },
  });

  return NextResponse.json({
    id: register.id,
    name: register.name,
    code: register.code,
    isActive: register.isActive,
    location: register.location,
    warehouse: register.warehouse,
    shifts: register.cashSessions.map((shift) => ({
      id: shift.id,
      cashier: shift.user,
      openedAt: shift.openedAt,
      closedAt: shift.closedAt,
      openingCash: Number(shift.openingCash),
      closingCash:
        shift.closingCash === null ? null : Number(shift.closingCash),
    })),
    recentSales: recentSales.map((sale) => ({
      id: sale.id,
      total: Number(sale.total),
      method: sale.method,
      createdAt: sale.createdAt,
      cashier: sale.cashSession?.user ?? null,
    })),
  });
}

// PATCH /api/pos-registers/[id]
// Mengubah nama, kode, gudang stok, outlet, atau status aktif mesin kasir.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  const canManage =
    session?.user?.id &&
    session.user.role === "ADMIN" &&
    (hasPermission(
      session.user.role,
      session.user.permissions,
      "systemSettings",
      "update"
    ) ||
      hasPermission(
        session.user.role,
        session.user.permissions,
        "warehouses",
        "update"
      ));
  if (!canManage) {
    return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
  }

  const { id } = await params;
  const registerId = Number(id);
  if (!Number.isSafeInteger(registerId) || registerId <= 0) {
    return NextResponse.json({ error: "Mesin kasir tidak valid" }, { status: 400 });
  }

  const existing = await prisma.posRegister.findUnique({
    where: { id: registerId },
    select: { id: true, locationId: true, cashSessions: { where: { closedAt: null }, select: { id: true }, take: 1 } },
  });
  if (!existing) {
    return NextResponse.json({ error: "Mesin kasir tidak ditemukan" }, { status: 404 });
  }
  if (!(await canAccessLocation(prisma, session.user.id, session.user.role, existing.locationId))) {
    return NextResponse.json(
      { error: "Anda tidak memiliki akses ke outlet mesin ini" },
      { status: 403 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Data permintaan tidak valid" }, { status: 400 });
  }
  const source = (body ?? {}) as Record<string, unknown>;

  const name = typeof source.name === "string" ? source.name.trim() : undefined;
  const code =
    typeof source.code === "string" ? source.code.trim().toUpperCase() : undefined;
  const locationId = source.locationId === undefined ? undefined : Number(source.locationId);
  const warehouseId =
    source.warehouseId === undefined ? undefined : Number(source.warehouseId);
  const isActive =
    typeof source.isActive === "boolean" ? source.isActive : undefined;

  if (name !== undefined && !name) {
    return NextResponse.json({ error: "Nama mesin kasir wajib diisi" }, { status: 400 });
  }
  if (code !== undefined && !code) {
    return NextResponse.json({ error: "Kode mesin kasir wajib diisi" }, { status: 400 });
  }
  if (locationId !== undefined && (!Number.isSafeInteger(locationId) || locationId <= 0)) {
    return NextResponse.json({ error: "Outlet tidak valid" }, { status: 400 });
  }
  if (warehouseId !== undefined && (!Number.isSafeInteger(warehouseId) || warehouseId <= 0)) {
    return NextResponse.json({ error: "Gudang stok tidak valid" }, { status: 400 });
  }
  if (isActive === false && existing.cashSessions.length > 0) {
    return NextResponse.json(
      { error: "Mesin kasir sedang dipakai pada shift aktif" },
      { status: 409 }
    );
  }
  if (locationId !== undefined) {
    if (!(await canAccessLocation(prisma, session.user.id, session.user.role, locationId))) {
      return NextResponse.json(
        { error: "Anda tidak memiliki akses ke outlet tujuan" },
        { status: 403 }
      );
    }
  }

  try {
    const register = await prisma.posRegister.update({
      where: { id: registerId },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(code !== undefined ? { code } : {}),
        ...(locationId !== undefined ? { locationId } : {}),
        ...(warehouseId !== undefined ? { warehouseId } : {}),
        ...(isActive !== undefined ? { isActive } : {}),
      },
      include: {
        location: { select: { id: true, name: true } },
        warehouse: { select: { id: true, name: true } },
      },
    });
    return NextResponse.json(register);
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
    console.error("Gagal memperbarui mesin kasir:", error);
    return NextResponse.json({ error: "Gagal memperbarui mesin kasir" }, { status: 500 });
  }
}
