import { createHash, randomBytes } from "crypto";
import bcrypt from "bcrypt";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/authOptions";
import prisma from "@/lib/prisma";
import { getMasterOwnerId } from "@/lib/userOwnership";
import {
  createEmptyPermissions,
  hasPermission,
  normalizePermissions,
} from "@/lib/permissions";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  const ownerId = await getMasterOwnerId();
  const isMasterOwner = session?.user?.id === ownerId;
  if (
    !session?.user?.id ||
    session.user.role !== "ADMIN" ||
    (!isMasterOwner &&
      !hasPermission(
      session.user.role,
      session.user.permissions,
      "systemSettings",
      "update"
      ))
  ) {
    return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, role: true, isActive: true, email: true },
  });
  if (!user || !user.isActive) {
    return NextResponse.json({ error: "Akun tidak ditemukan" }, { status: 404 });
  }
  if (id === ownerId) {
    return NextResponse.json(
      { error: "Pengguna pemilik utama tidak dapat diubah." },
      { status: 400 }
    );
  }

  if (id === session.user.id && body.role && body.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Role akun admin yang sedang digunakan tidak dapat diturunkan." },
      { status: 400 }
    );
  }

  const role = body.role === "ADMIN" || body.role === "CASHIER" ? body.role : undefined;
  const permissions =
    body.permissions === undefined
      ? undefined
      : {
          ...createEmptyPermissions(),
          ...normalizePermissions(body.permissions),
        };
  if (
    id === session.user.id &&
    permissions &&
    (permissions.systemSettings?.view !== true ||
      permissions.systemSettings?.update !== true)
  ) {
    return NextResponse.json(
      {
        error:
          "Akun yang sedang digunakan harus tetap memiliki izin melihat dan mengatur pengguna.",
      },
      { status: 400 }
    );
  }

  try {
    const updated = await prisma.user.update({
      where: { id },
      data: {
        ...(role ? { role } : {}),
        ...(permissions ? { permissions } : {}),
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
    return NextResponse.json(updated);
  } catch (error) {
    console.error("Gagal memperbarui role dan hak akses akun:", error);
    return NextResponse.json(
      { error: "Gagal memperbarui role dan hak akses akun." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  const ownerId = await getMasterOwnerId();
  const isMasterOwner = session?.user?.id === ownerId;
  if (
    !session?.user?.id ||
    session.user.role !== "ADMIN" ||
    (!isMasterOwner &&
      !hasPermission(
      session.user.role,
      session.user.permissions,
      "systemSettings",
      "delete"
      ))
  ) {
    return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
  }

  const { id } = await params;
  if (id === session.user.id || id === ownerId) {
    return NextResponse.json(
      { error: "Akun yang sedang digunakan atau pemilik utama tidak dapat dihapus." },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, role: true, isActive: true, email: true },
  });
  if (!user || !user.isActive) {
    return NextResponse.json({ error: "Pengguna tidak ditemukan." }, { status: 404 });
  }

  if (user.role === "ADMIN") {
    const activeAdministratorCount = await prisma.user.count({
      where: { role: "ADMIN", isActive: true },
    });
    if (activeAdministratorCount <= 1) {
      return NextResponse.json(
        { error: "Administrator aktif terakhir tidak dapat dihapus." },
        { status: 400 }
      );
    }
  }

  try {
    const password = await bcrypt.hash(randomBytes(32).toString("hex"), 10);
    await prisma.user.update({
      where: { id, isActive: true },
      data: {
        name: "Pengguna dihapus",
        email: `deleted-${id}@deleted.invalid`,
        deletedEmailHash: createHash("sha256")
          .update(user.email.trim().toLowerCase())
          .digest("hex"),
        password,
        role: "CASHIER",
        permissions: {},
        isActive: false,
      },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Gagal menghapus pengguna:", error);
    return NextResponse.json(
      { error: "Gagal menghapus pengguna." },
      { status: 500 }
    );
  }
}
