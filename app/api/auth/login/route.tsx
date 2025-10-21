import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import prisma from "@/lib/prisma";

export async function POST(req) {
  try {
    const { email, password } = await req.json();

    if (!email || !password)
      return NextResponse.json(
        { error: "Email & password wajib diisi" },
        { status: 400 }
      );

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user)
      return NextResponse.json(
        { error: "User tidak ditemukan" },
        { status: 404 }
      );

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid)
      return NextResponse.json({ error: "Password salah" }, { status: 401 });

    // Hanya kembalikan user object
    return NextResponse.json(
      { id: user.id.toString(), name: user.name, email: user.email },
      { status: 200 }
    );
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Terjadi kesalahan" }, { status: 500 });
  }
}
