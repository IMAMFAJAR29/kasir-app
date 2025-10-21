import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const { status } = await req.json();

    if (!["paid", "unpaid"].includes(status)) {
      return NextResponse.json({ error: "Status invalid" }, { status: 400 });
    }

    const updatedInvoice = await prisma.invoice.update({
      where: { id: Number(id) },
      data: { status },
    });

    return NextResponse.json(updatedInvoice);
  } catch (err) {
    console.error("❌ Error update status:", err);
    return NextResponse.json({ error: "Update status gagal" }, { status: 500 });
  }
}
