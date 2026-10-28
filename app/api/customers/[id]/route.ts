import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { hasPermission } from "@/lib/permissions";
import prisma from "@/lib/prisma";

// GET detail pelanggan
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const auth = await getServerSession(authOptions);
  if (!auth?.user?.id) {
    return NextResponse.json({ error: "Autentikasi diperlukan" }, { status: 401 });
  }
  if (!hasPermission(auth.user.role, auth.user.permissions, "customers", "view")) {
    return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
  }
  try {
    const customer = await prisma.customer.findUnique({
      where: { id: Number(params.id) },
    });

    if (!customer) {
      return NextResponse.json(
        { error: "Pelanggan tidak ditemukan" },
        { status: 404 }
      );
    }

    return NextResponse.json(customer);
  } catch (err) {
    console.error("Error get customer:", err);
    return NextResponse.json(
      { error: "Gagal mengambil data pelanggan" },
      { status: 500 }
    );
  }
}

// PUT update pelanggan
export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  const auth = await getServerSession(authOptions);
  if (!auth?.user?.id) {
    return NextResponse.json({ error: "Autentikasi diperlukan" }, { status: 401 });
  }
  if (!hasPermission(auth.user.role, auth.user.permissions, "customers", "update")) {
    return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
  }
  try {
    const body = await req.json();
    const { name, email, phone, address } = body;

    const customer = await prisma.customer.update({
      where: { id: Number(params.id) },
      data: { name, email, phone, address },
    });

    return NextResponse.json(customer);
  } catch (err) {
    console.error("Error update customer:", err);
    return NextResponse.json(
      { error: "Gagal memperbarui data pelanggan" },
      { status: 500 }
    );
  }
}

// DELETE hapus pelanggan
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const auth = await getServerSession(authOptions);
  if (!auth?.user?.id) {
    return NextResponse.json({ error: "Autentikasi diperlukan" }, { status: 401 });
  }
  if (!hasPermission(auth.user.role, auth.user.permissions, "customers", "delete")) {
    return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
  }
  try {
    await prisma.customer.delete({
      where: { id: Number(params.id) },
    });

    return NextResponse.json({ message: "Pelanggan berhasil dihapus" });
  } catch (err) {
    console.error("Error delete customer:", err);
    return NextResponse.json(
      { error: "Gagal menghapus pelanggan" },
      { status: 500 }
    );
  }
}
