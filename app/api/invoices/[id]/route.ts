import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { hasPermission } from "@/lib/permissions";
import prisma from "@/lib/prisma";
import { incrementStockAtLocation, getDefaultLocationId } from "@/lib/productStock";
import { processInvoiceAccounting } from "@/lib/accounting/invoiceAccounting";
import { reverseJournalEntry } from "@/lib/accounting/postingService";
import { getErrorMessage } from "@/lib/prismaErrors";

// ✅ GET by ID
export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await getServerSession(authOptions);
  if (!auth?.user?.id) {
    return NextResponse.json({ error: "Autentikasi diperlukan" }, { status: 401 });
  }
  if (!hasPermission(auth.user.role, auth.user.permissions, "invoices", "view")) {
    return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
  }
  try {
    const { id } = await context.params;
    const invoiceId = Number(id);

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        customer: { select: { name: true } },
        location: { select: { name: true } },
        tax: true,
        items: { include: { product: true } },
      },
    });

    if (!invoice)
      return NextResponse.json(
        { error: "Faktur tidak ditemukan" },
        { status: 404 }
      );

    return NextResponse.json(invoice);
  } catch (err) {
    console.error("❌ Error get invoice:", err);
    return NextResponse.json(
      { error: "Gagal mengambil faktur" },
      { status: 500 }
    );
  }
}

// ✅ PUT (update invoice)
export async function PUT(
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
    const invoiceId = Number(id);
    const body = await req.json();

    const existingInvoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      select: {
        id: true,
        status: true,
        paidAmount: true,
        locationId: true,
        saleId: true,
        items: { select: { productId: true, qty: true } },
      },
    });
    if (!existingInvoice)
      return NextResponse.json(
        { error: "Faktur tidak ditemukan" },
        { status: 404 }
      );
    if (existingInvoice.saleId !== null)
      return NextResponse.json(
        {
          error:
            "Faktur dari transaksi POS tidak dapat diubah dari menu faktur. Kelola melalui riwayat penjualan.",
        },
        { status: 409 }
      );
    if (existingInvoice.status === "paid")
      return NextResponse.json(
        { error: "Faktur yang sudah lunas tidak bisa diedit" },
        { status: 400 }
      );

    const {
      invoiceNumber,
      customerId,
      locationId,
      items,
      taxId,
      date,
      termin,
      dueDate,
      refNo,
      salesman,
      discount,
      shipping,
      notes,
      status = existingInvoice.status,
    } = body;

    if (!Array.isArray(items) || items.length === 0)
      return NextResponse.json(
        { error: "Item tidak boleh kosong" },
        { status: 400 }
      );
    if (!["paid", "unpaid"].includes(status)) {
      return NextResponse.json(
        { error: "Status pembayaran tidak valid" },
        { status: 400 }
      );
    }

    const locationIdNumber = Number(locationId);
    if (!Number.isSafeInteger(locationIdNumber) || locationIdNumber <= 0) {
      return NextResponse.json({ error: "Lokasi faktur tidak valid" }, { status: 400 });
    }

    let subtotal = 0;
    const itemData: Array<{
      productId: number;
      qty: number;
      price: number;
      subtotal: number;
    }> = [];

    for (const item of items) {
      if (!item || typeof item !== "object") {
        return NextResponse.json(
          { error: "Item faktur tidak valid" },
          { status: 400 }
        );
      }
      if (!item.productId) continue;

      const qty = Number(item.qty);
      const price = Number(item.price);
      if (
        !Number.isSafeInteger(qty) ||
        qty <= 0 ||
        !Number.isFinite(price) ||
        price < 0
      ) {
        return NextResponse.json(
          { error: "Qty atau harga item tidak valid" },
          { status: 400 }
        );
      }

      const sub = qty * price;
      subtotal += sub;
      itemData.push({
        productId: Number(item.productId),
        qty,
        price,
        subtotal: sub,
      });
    }

    if (itemData.length === 0) {
      return NextResponse.json(
        { error: "Semua item harus memiliki productId" },
        { status: 400 }
      );
    }

    let taxRate = 0;
    if (taxId) {
      const tax = await prisma.tax.findUnique({ where: { id: Number(taxId) } });
      if (tax) taxRate = Number(tax.rate);
    }

    const discountValue = Number(discount || 0);
    const shippingValue = Number(shipping || 0);
    const taxAmount =
      ((subtotal - discountValue + shippingValue) * taxRate) / 100;
    const totalAmount =
      subtotal + shippingValue - discountValue + taxAmount;

    const updated = await prisma.$transaction(async (tx) => {
      // Kembalikan stok item lama ke lokasi faktur lama sebelum item diganti.
      for (const item of existingInvoice.items) {
        await incrementStockAtLocation(tx, {
          productId: item.productId,
          locationId: existingInvoice.locationId ?? locationIdNumber,
          qty: item.qty,
        });
      }

      const saved = await tx.invoice.update({
        where: { id: invoiceId },
        data: {
          invoiceNumber,
          customerId: Number(customerId),
          locationId: locationIdNumber,
          taxId: taxId ? Number(taxId) : null,
          date: date ? new Date(date) : null,
          termin: termin === "" || termin == null ? null : Number(termin),
          dueDate: dueDate ? new Date(dueDate) : null,
          refNo: refNo || null,
          salesman: salesman || null,
          discount: discountValue,
          shipping: shippingValue,
          notes: notes || "",
          totalAmount,
          paidAmount:
            status === "paid" ? totalAmount : existingInvoice.paidAmount,
          status,
          items: {
            deleteMany: {},
            create: itemData,
          },
        },
        include: {
          customer: { select: { name: true } },
          location: { select: { name: true } },
          items: true,
        },
      });

      // Reverse jurnal faktur lama, lalu posting ulang sesuai nilai baru.
      const previousJournal = await tx.journalEntry.findFirst({
        where: {
          sourceType: "INVOICE",
          sourceId: String(invoiceId),
          isReversal: false,
          status: "POSTED",
        },
        select: { id: true },
      });
      if (previousJournal) {
        await reverseJournalEntry(
          previousJournal.id,
          "Revisi faktur penjualan",
          tx
        );
      }

      await processInvoiceAccounting(
        {
          invoiceId: saved.id,
          invoiceNumber: saved.invoiceNumber,
          date: date ? new Date(date) : new Date(),
          locationId: locationIdNumber,
          status,
          subtotal,
          discount: discountValue,
          shipping: shippingValue,
          taxAmount,
          totalAmount,
          items: itemData.map((item) => ({
            productId: item.productId,
            qty: item.qty,
          })),
        },
        tx
      );

      return saved;
    });

    return NextResponse.json(updated);
  } catch (err) {
    if (err && typeof err === "object" && "code" in err) {
      if (err.code === "INSUFFICIENT_STOCK") {
        return NextResponse.json(
          { error: getErrorMessage(err, "Stok tidak mencukupi") },
          { status: 409 }
        );
      }
      if (err.code === "INVALID_STOCK") {
        return NextResponse.json(
          { error: getErrorMessage(err, "Stok tidak valid") },
          { status: 400 }
        );
      }
    }

    console.error("❌ Error update invoice:", err);
    return NextResponse.json({ error: "Gagal update faktur" }, { status: 500 });
  }
}
// ✅ DELETE: Hapus invoice by ID
export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await getServerSession(authOptions);
  if (!auth?.user?.id) {
    return NextResponse.json({ error: "Autentikasi diperlukan" }, { status: 401 });
  }
  if (!hasPermission(auth.user.role, auth.user.permissions, "invoices", "delete")) {
    return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
  }
  try {
    const { id } = await context.params;
    const invoiceId = Number(id);

    if (!invoiceId)
      return NextResponse.json(
        { error: "ID faktur tidak valid" },
        { status: 400 }
      );

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      select: {
        id: true,
        status: true,
        saleId: true,
        locationId: true,
        items: { select: { productId: true, qty: true } },
      },
    });
    if (!invoice)
      return NextResponse.json(
        { error: "Faktur tidak ditemukan" },
        { status: 404 }
      );

    if (invoice.saleId !== null)
      return NextResponse.json(
        {
          error:
            "Faktur dari transaksi POS tidak dapat dihapus dari menu faktur. Kelola melalui riwayat penjualan.",
        },
        { status: 409 }
      );

    if (invoice.status === "paid")
      return NextResponse.json(
        { error: "Faktur yang sudah dibayar tidak bisa dihapus" },
        { status: 400 }
      );

    await prisma.$transaction(async (tx) => {
      // Kembalikan stok item faktur ke lokasi asal.
      const restoreLocationId =
        invoice.locationId ?? (await getDefaultLocationId(tx));
      for (const item of invoice.items) {
        await incrementStockAtLocation(tx, {
          productId: item.productId,
          locationId: restoreLocationId,
          qty: item.qty,
        });
      }

      // Reverse jurnal faktur agar laporan keuangan tetap seimbang.
      const previousJournal = await tx.journalEntry.findFirst({
        where: {
          sourceType: "INVOICE",
          sourceId: String(invoiceId),
          isReversal: false,
          status: "POSTED",
        },
        select: { id: true },
      });
      if (previousJournal) {
        await reverseJournalEntry(
          previousJournal.id,
          "Faktur penjualan dihapus",
          tx
        );
      }

      // Hapus item terkait
      await tx.invoiceItem.deleteMany({ where: { invoiceId } });

      // Hapus invoice
      await tx.invoice.delete({ where: { id: invoiceId } });
    });

    return NextResponse.json(
      { message: "Faktur berhasil dihapus" },
      { status: 200 }
    );
  } catch (err) {
    if (err && typeof err === "object" && "code" in err) {
      if (err.code === "INSUFFICIENT_STOCK") {
        return NextResponse.json(
          { error: getErrorMessage(err, "Stok tidak mencukupi") },
          { status: 409 }
        );
      }
      if (err.code === "INVALID_STOCK") {
        return NextResponse.json(
          { error: getErrorMessage(err, "Stok tidak valid") },
          { status: 400 }
        );
      }
    }

    console.error("❌ Error delete invoice:", err);
    return NextResponse.json(
      { error: "Gagal menghapus faktur" },
      { status: 500 }
    );
  }
}
