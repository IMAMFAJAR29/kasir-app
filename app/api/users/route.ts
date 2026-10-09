import bcrypt from "bcrypt";
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
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      permissions: true,
      isActive: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(
    users.map((user) => ({ ...user, isOwner: user.id === ownerId }))
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
  const password = typeof body.password === "string" ? body.password : "";
  if (body.role !== "CASHIER" && body.role !== "ADMIN") {
    return NextResponse.json({ error: "Peran pengguna tidak valid" }, { status: 400 });
  }
  const requestedRole = body.role;
  const permissions = normalizePermissions(body.permissions);

  if (!name || !email || password.length < 6) {
    return NextResponse.json(
      { error: "Nama, email, dan password minimal 6 karakter wajib diisi" },
      { status: 400 }
    );
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Format email tidak valid" }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  try {
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: passwordHash,
        role: requestedRole,
        permissions:
          requestedRole === "CASHIER"
            ? Object.keys(permissions).length === 0
              ? defaultCashierPermissions
              : permissions
            : Object.keys(permissions).length === 0
              ? defaultAdministratorPermissions
              : {
                  ...createEmptyPermissions(),
                  ...permissions,
                },
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        permissions: true,
        isActive: true,
        createdAt: true,
      },
    });
    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return NextResponse.json({ error: "Email sudah terdaftar" }, { status: 409 });
    }
    console.error("Gagal membuat pengguna:", error);
    return NextResponse.json({ error: "Gagal membuat pengguna" }, { status: 500 });
  }
}
