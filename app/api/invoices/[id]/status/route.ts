import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { hasPermission } from "@/lib/permissions";
import prisma from "@/lib/prisma";
import { postJournalEntry } from "@/lib/accounting/postingService";

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await getServerSession(authOptions);
  if (!auth?.user?.id) {
    return NextResponse.json({ error: "Autentikasi diperlukan" }, { status: 401 });
  }
  if (!hasPermission(auth.user.role, auth.user.permissions, "invoices", "update")) {
    return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
  }
  try {
    const { id } = await context.params;
    const body = await req.json();
    const { status, paymentMethod = "BANK_TRANSFER" } = body;

    if (!["paid", "unpaid"].includes(status)) {
      return NextResponse.json({ error: "Status invalid" }, { status: 400 });
    }

    const invoiceId = Number(id);
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      select: {
        id: true,
        invoiceNumber: true,
        totalAmount: true,
        paidAmount: true,
        status: true,
        locationId: true,
      },
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

    // Pelunasan Piutang Faktur (status === "paid")
    const updatedInvoice = await prisma.$transaction(async (tx) => {
      const remainingAmount = Number(invoice.totalAmount) - Number(invoice.paidAmount);
      const paymentAmount = remainingAmount > 0 ? remainingAmount : Number(invoice.totalAmount);

      const inv = await tx.invoice.update({
        where: { id: invoiceId },
        data: {
          status: "paid",
          paidAmount: invoice.totalAmount,
        },
      });

      const now = new Date();
      const paymentNumber = `PAY-AR-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${invoice.id}`;

      const payment = await tx.payment.create({
        data: {
          paymentNumber,
          type: "RECEIPT",
          method: paymentMethod,
          amount: paymentAmount,
          invoiceId: invoice.id,
          notes: `Pelunasan Faktur Penjualan #${invoice.invoiceNumber}`,
        },
      });

      const receiptAccount = paymentMethod === "CASH" ? "1-1001" : "1-1002";

      // Posting Jurnal Pelunasan Piutang
      await postJournalEntry(
        {
          sourceType: "PAYMENT",
          sourceId: payment.id,
          description: `Pelunasan Piutang Faktur #${invoice.invoiceNumber}`,
          transactionDate: now,
          lines: [
            {
              accountCode: receiptAccount,
              debit: paymentAmount,
              credit: 0,
              description: `Penerimaan Kas/Bank Pelunasan Faktur #${invoice.invoiceNumber}`,
              locationId: invoice.locationId || undefined,
            },
            {
              accountCode: "1-1200", // Piutang Usaha berkurang di Kredit
              debit: 0,
              credit: paymentAmount,
              description: `Pelunasan Piutang Usaha Faktur #${invoice.invoiceNumber}`,
              locationId: invoice.locationId || undefined,
            },
          ],
        },
        tx
      );

      return inv;
    });

    return NextResponse.json(updatedInvoice);
  } catch (err) {
    console.error("❌ Error update status:", err);
    return NextResponse.json({ error: "Update status gagal" }, { status: 500 });
  }
}
