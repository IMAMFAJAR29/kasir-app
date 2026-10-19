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

    const invoiceId = Number(id);
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      select: { id: true, totalAmount: true, status: true },
    });
    if (!invoice) {
      return NextResponse.json({ error: "Faktur tidak ditemukan" }, { status: 404 });
    }

    if (invoice.status === "paid" && status === "unpaid") {
      return NextResponse.json(
        { error: "Status faktur yang sudah lunas tidak dapat diubah kembali" },
        { status: 400 }
      );
    }

    if (status === "unpaid") {
      const result = await prisma.invoice.updateMany({
        where: { id: invoiceId, status: { not: "paid" } },
        data: { status: "unpaid", paidAmount: 0 },
      });

      if (result.count === 0) {
        return NextResponse.json(
          { error: "Status faktur yang sudah lunas tidak dapat diubah kembali" },
          { status: 400 }
        );
      }

      const updatedInvoice = await prisma.invoice.findUnique({
        where: { id: invoiceId },
      });
      return NextResponse.json(updatedInvoice);
    }

    const updatedInvoice = await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        status: "paid",
        paidAmount: invoice.totalAmount,
      },
    });

    return NextResponse.json(updatedInvoice);
  } catch (err) {
    console.error("❌ Error update status:", err);
    return NextResponse.json({ error: "Update status gagal" }, { status: 500 });
  }
}
