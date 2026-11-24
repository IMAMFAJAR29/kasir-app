import { createHash, randomBytes } from "crypto";
import bcrypt from "bcrypt";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/authOptions";
import prisma from "@/lib/prisma";
import { getMasterOwnerId } from "@/lib/userOwnership";
import { clearCashierLoginFailures } from "@/lib/cashierLoginRateLimit";
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
    select: {
      id: true,
      role: true,
      isActive: true,
      email: true,
      nik: true,
      pinHash: true,
    },
  });
  if (!user) {
    return NextResponse.json({ error: "Akun tidak ditemukan" }, { status: 404 });
  }
  if (id === ownerId) {
    const blockedFields = [
      "role",
      "email",
      "nik",
      "pin",
      "isActive",
      "permissions",
    ].filter((field) => body[field] !== undefined);
    if (blockedFields.length > 0) {
      return NextResponse.json(
        {
          error:
            "Akun pemilik utama hanya dapat mengubah nama dan password-nya. Akun admin dan kasir dikelola dari menu yang sama.",
        },
        { status: 400 }
      );
    }
  }

  if (id === session.user.id && body.role && body.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Role akun admin yang sedang digunakan tidak dapat diturunkan." },
      { status: 400 }
    );
  }

  const role = body.role === "ADMIN" || body.role === "CASHIER" ? body.role : undefined;
  const name = typeof body.name === "string" ? body.name.trim() : undefined;
  const email =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : undefined;
  const password = typeof body.password === "string" ? body.password : undefined;
  const nik =
    typeof body.nik === "string" ? body.nik.trim() : undefined;
  const pin = typeof body.pin === "string" ? body.pin : undefined;
  if (name !== undefined && !name) {
    return NextResponse.json({ error: "Nama pengguna wajib diisi." }, { status: 400 });
  }
  if (nik !== undefined && nik !== "" && !/^\d{6,20}$/.test(nik)) {
    return NextResponse.json(
      { error: "NIK wajib berupa 6 sampai 20 digit angka." },
      { status: 400 }
    );
  }
  if (nik === "") {
    return NextResponse.json({ error: "NIK wajib diisi." }, { status: 400 });
  }
  if (pin !== undefined && pin !== "" && !/^\d{6,12}$/.test(pin)) {
    return NextResponse.json(
      { error: "PIN wajib berupa 6 sampai 12 digit angka." },
      { status: 400 }
    );
  }
  const resultingRole = role || user.role;
  if (email !== undefined && email !== "" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json(
      { error: "Format email tidak valid." },
      { status: 400 }
    );
  }
  if (
    resultingRole === "ADMIN" &&
    user.role !== "ADMIN" &&
    !(nik || user.nik)
  ) {
    return NextResponse.json(
      { error: "Akun administrator memerlukan NIK agar dapat login." },
      { status: 400 }
    );
  }
  if (
    resultingRole === "ADMIN" &&
    user.role !== "ADMIN" &&
    !(pin || user.pinHash)
  ) {
    return NextResponse.json(
      { error: "Akun administrator memerlukan PIN agar dapat login." },
      { status: 400 }
    );
  }
  if (password !== undefined && password.length < 6) {
    return NextResponse.json(
      { error: "Password minimal harus terdiri dari 6 karakter." },
      { status: 400 }
    );
  }
  const pinHash =
    pin && pin.length > 0 ? await bcrypt.hash(pin, 12) : undefined;
  if (
    resultingRole === "CASHIER" &&
    role === "CASHIER" &&
    (!nik && !user.nik)
  ) {
    return NextResponse.json(
      { error: "Akun kasir memerlukan NIK sebelum dapat digunakan." },
      { status: 400 }
    );
  }
  if (body.isActive !== undefined && typeof body.isActive !== "boolean") {
    return NextResponse.json({ error: "Status akun tidak valid." }, { status: 400 });
  }
  if (id === session.user.id && body.isActive === false) {
    return NextResponse.json(
      { error: "Akun yang sedang digunakan tidak dapat dinonaktifkan." },
      { status: 400 }
    );
  }
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
    const locationIds: number[] | undefined =
      body.locationIds === undefined
        ? undefined
        : Array.from(
            new Set<number>(
              (Array.isArray(body.locationIds) ? body.locationIds : [])
                .map((entry: unknown) => Number(entry))
                .filter((value: number) => Number.isSafeInteger(value) && value > 0)
            )
          );
    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.user.update({
        where: { id },
        data: {
          ...(role ? { role } : {}),
          ...(name !== undefined ? { name } : {}),
          ...(nik !== undefined ? { nik } : {}),
          ...(pinHash ? { pinHash } : {}),
          ...(email !== undefined && email !== "" ? { email } : {}),
          ...(password ? { password: await bcrypt.hash(password, 10) } : {}),
          ...(typeof body.isActive === "boolean"
            ? { isActive: body.isActive }
            : {}),
          ...(permissions ? { permissions } : {}),
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

      if (locationIds !== undefined) {
        await tx.userLocationAccess.deleteMany({ where: { userId: id } });
        if (locationIds.length > 0) {
          await tx.userLocationAccess.createMany({
            data: locationIds.map((locationId) => ({ userId: id, locationId })),
          });
        }
      }

      return {
        ...result,
        locationIds:
          locationIds !== undefined
            ? locationIds
            : undefined,
      };
    });
    if (pinHash || nik !== undefined && nik !== user.nik) {
      if (user.nik) await clearCashierLoginFailures(user.nik);
      const updatedNik = nik ?? user.nik;
      if (updatedNik && updatedNik !== user.nik) {
        await clearCashierLoginFailures(updatedNik);
      }
    }
    return NextResponse.json(updated);
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: email !== undefined ? "Email sudah terdaftar." : "NIK sudah terdaftar." },
        { status: 409 }
      );
    }
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
  if (!user) {
    return NextResponse.json({ error: "Pengguna tidak ditemukan." }, { status: 404 });
  }

  if (user.role === "ADMIN" && user.isActive) {
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
      where: { id },
      data: {
        name: "Pengguna dihapus",
        email: `deleted-${id}@deleted.invalid`,
        deletedEmailHash: createHash("sha256")
          .update(user.email?.trim().toLowerCase() || `deleted-user-${id}`)
          .digest("hex"),
        password,
        nik: null,
        pinHash: null,
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
