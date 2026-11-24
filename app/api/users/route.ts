import bcrypt from "bcrypt";
import { randomBytes } from "crypto";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/authOptions";
import prisma from "@/lib/prisma";
import { getMasterOwnerId } from "@/lib/userOwnership";
import {
  createEmptyPermissions,
  defaultAdministratorPermissions,
  defaultCashierPermissions,
  hasPermission,
  normalizePermissions,
} from "@/lib/permissions";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  return session?.user?.role === "ADMIN" ? session : null;
}

/** Normalisasi daftar locationId dari body menjadi angka unik yang valid. */
function parseLocationIds(value: unknown): number[] | null {
  if (value === undefined) return null;
  if (!Array.isArray(value)) return [];
  const ids = value
    .map((entry) => Number(entry))
    .filter((id) => Number.isSafeInteger(id) && id > 0);
  return Array.from(new Set(ids));
}

export async function GET() {
  const admin = await requireAdmin();
  const ownerId = await getMasterOwnerId();
  const isMasterOwner = admin?.user.id === ownerId;
  if (
    !admin ||
    (!isMasterOwner &&
      !hasPermission(
      admin.user.role,
      admin.user.permissions,
      "systemSettings",
      "view"
      ))
  ) {
    return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    where: { deletedEmailHash: null },
    select: {
      id: true,
      name: true,
      email: true,
      nik: true,
      role: true,
      permissions: true,
      isActive: true,
      createdAt: true,
      locationAccess: { select: { locationId: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(
    users.map((user) => ({
      ...user,
      locationIds: user.locationAccess.map((access) => access.locationId),
      locationAccess: undefined,
      isOwner: user.id === ownerId,
    }))
  );
}

export async function POST(request: Request) {
  const admin = await requireAdmin();
  const ownerId = await getMasterOwnerId();
  const isMasterOwner = admin?.user.id === ownerId;
  if (
    !admin ||
    (!isMasterOwner &&
      !hasPermission(
      admin.user.role,
      admin.user.permissions,
      "systemSettings",
      "create"
      ))
  ) {
    return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
  }

  const body = await request.json();
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const nik = typeof body.nik === "string" ? body.nik.trim() : "";
  const pin = typeof body.pin === "string" ? body.pin : "";
  if (body.role !== "CASHIER" && body.role !== "ADMIN") {
    return NextResponse.json({ error: "Peran pengguna tidak valid" }, { status: 400 });
  }
  const requestedRole = body.role;
  const permissions = normalizePermissions(body.permissions);

  if (!name) {
    return NextResponse.json({ error: "Nama pengguna wajib diisi" }, { status: 400 });
  }
  // Semua akun selain pemilik utama login dengan NIK + PIN, termasuk admin.
  if (!/^\d{6,20}$/.test(nik)) {
    return NextResponse.json(
      { error: "NIK wajib berupa 6 sampai 20 digit angka." },
      { status: 400 }
    );
  }
  if (!/^\d{6,12}$/.test(pin)) {
    return NextResponse.json(
      { error: "PIN wajib berupa 6 sampai 12 digit angka." },
      { status: 400 }
    );
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Format email tidak valid" }, { status: 400 });
  }

  const pinHash = await bcrypt.hash(pin, 12);
  const passwordHash = await bcrypt.hash(randomBytes(32).toString("hex"), 10);
  const locationIds = parseLocationIds(body.locationIds);
  const effectivePermissions =
    Object.keys(permissions).length === 0
      ? requestedRole === "CASHIER"
        ? defaultCashierPermissions
        : defaultAdministratorPermissions
      : { ...createEmptyPermissions(), ...permissions };

  try {
    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          name,
          email: email || null,
          password: passwordHash,
          pinHash,
          nik,
          role: requestedRole,
          isActive: body.isActive !== false,
          permissions: effectivePermissions,
        },
        select: {
          id: true,
          name: true,
          email: true,
          nik: true,
          role: true,
          permissions: true,
          isActive: true,
          createdAt: true,
        },
      });

      if (locationIds && locationIds.length > 0) {
        await tx.userLocationAccess.createMany({
          data: locationIds.map((locationId) => ({
            userId: created.id,
            locationId,
          })),
        });
      }

      return { ...created, locationIds: locationIds ?? [] };
    });
    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2002"
    ) {
      const target = (error as { meta?: { target?: unknown } }).meta?.target;
      const isEmailConflict = Array.isArray(target) && target.includes("email");
      return NextResponse.json(
        { error: isEmailConflict ? "Email sudah terdaftar." : "NIK sudah terdaftar." },
        { status: 409 }
      );
    }
    console.error("Gagal membuat pengguna:", error);
    return NextResponse.json({ error: "Gagal membuat pengguna" }, { status: 500 });
  }
}
