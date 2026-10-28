import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { hasPermission } from "@/lib/permissions";
import prisma from "@/lib/prisma";

// GET semua pelanggan
export async function GET() {
  const auth = await getServerSession(authOptions);
  if (!auth?.user?.id) {
    return NextResponse.json({ error: "Autentikasi diperlukan" }, { status: 401 });
  }
  if (!hasPermission(auth.user.role, auth.user.permissions, "customers", "view")) {
    return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
  }
  try {
    const customers = await prisma.customer.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(customers);
  } catch (err) {
    console.error("Error get customers:", err);
    return NextResponse.json(
      { error: "Gagal mengambil daftar pelanggan" },
      { status: 500 }
    );
  }
}

// POST tambah pelanggan baru
export async function POST(req: Request) {
  const auth = await getServerSession(authOptions);
  if (!auth?.user?.id) {
    return NextResponse.json({ error: "Autentikasi diperlukan" }, { status: 401 });
  }
  if (!hasPermission(auth.user.role, auth.user.permissions, "customers", "create")) {
    return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
  }
  try {
    const body = await req.json();
    const { name, email, phone, address } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Nama pelanggan wajib diisi" },
        { status: 400 }
      );
    }

    const customer = await prisma.customer.create({
      data: { name, email, phone, address },
    });

    return NextResponse.json(customer, { status: 201 });
  } catch (err) {
    console.error("Error create customer:", err);
    return NextResponse.json(
      { error: "Gagal menambahkan pelanggan" },
      { status: 500 }
    );
  }
}
