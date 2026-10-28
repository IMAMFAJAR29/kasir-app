import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { hasPermission } from "@/lib/permissions";
import prisma from "@/lib/prisma";

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await getServerSession(authOptions);
  if (!auth?.user?.id) {
    return NextResponse.json({ error: "Autentikasi diperlukan" }, { status: 401 });
  }
  if (!hasPermission(auth.user.role, auth.user.permissions, "purchases", "update")) {
    return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
  }
  try {
    const { id } = await context.params;
    const { status } = await req.json();

    if (!["paid", "unpaid"].includes(status)) {
      return NextResponse.json({ error: "Status invalid" }, { status: 400 });
    }

    const updatedPurchase = await prisma.purchase.update({
      where: { id: Number(id) },
      data: { status },
    });

    return NextResponse.json(updatedPurchase);
  } catch (err) {
    console.error("❌ Error update purchase status:", err);
    return NextResponse.json(
      { error: "Gagal memperbarui status" },
      { status: 500 }
    );
  }
}
