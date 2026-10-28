import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import prisma from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const auth = await getServerSession(authOptions);
  if (!auth?.user?.id) {
    return NextResponse.json({ error: "Autentikasi diperlukan" }, { status: 401 });
  }
  if (!hasPermission(auth.user.role, auth.user.permissions, "sales", "view")) {
    return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
  }

  try {
    const { id } = params;
    const sale = await prisma.sale.findUnique({
      where: { id: Number(id) },
      include: {
        items: { include: { product: true } },
        invoices: true,
      },
    });

    if (!sale) {
      return NextResponse.json(
        { error: "Data tidak ditemukan" },
        { status: 404 }
      );
    }

    return NextResponse.json(sale);
  } catch (err) {
    console.error("❌ Gagal ambil laporan:", err);
    return NextResponse.json({ error: "Gagal ambil laporan" }, { status: 500 });
  }
}