import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";
import prisma from "@/lib/prisma";
import { hasPermission, type UserPermissions } from "@/lib/permissions";

export async function POST(req: NextRequest) {
  try {
    const { email, password, expectedArea } = await req.json();

    if (!email || !password)
      return NextResponse.json(
        { error: "Email & password wajib diisi" },
        { status: 400 }
      );
    if (!["dashboard", "pos"].includes(expectedArea))
      return NextResponse.json(
        { error: "Pilih area login yang valid" },
        { status: 400 }
      );

    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
    if (!user || !user.isActive)
      return NextResponse.json(
        { error: "Pengguna tidak ditemukan atau sudah dinonaktifkan." },
        { status: 404 }
      );

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid)
      return NextResponse.json({ error: "Password salah" }, { status: 401 });
    const userPermissions = user.permissions as UserPermissions;
    const canUseSelectedLogin =
      hasPermission(
        user.role,
        userPermissions,
        expectedArea === "dashboard" ? "dashboard" : "pos",
        "view"
      ) ||
      (expectedArea === "dashboard" &&
        hasPermission(
          user.role,
          userPermissions,
          "systemSettings",
          "view"
        ));
    if (!canUseSelectedLogin)
      return NextResponse.json(
        {
          error:
            expectedArea === "dashboard"
              ? "Akun ini tidak memiliki akses Dashboard."
              : "Akun ini tidak memiliki akses POS.",
        },
        { status: 403 }
      );

    return NextResponse.json(
      {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        permissions: user.permissions,
        isActive: user.isActive,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Terjadi kesalahan" }, { status: 500 });
  }
}
