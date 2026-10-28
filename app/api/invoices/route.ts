import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { hasPermission } from "@/lib/permissions";
import prisma from "@/lib/prisma";
import { processInvoiceAccounting } from "@/lib/accounting/invoiceAccounting";

// ✅ GET: Ambil semua invoice
export async function GET() {
  const auth = await getServerSession(authOptions);
  if (!auth?.user?.id) {
    return NextResponse.json({ error: "Autentikasi diperlukan" }, { status: 401 });
  }
  if (!hasPermission(auth.user.role, auth.user.permissions, "invoices", "view")) {
    return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
  }
  try {
    const invoices = await prisma.invoice.findMany({
      include: {
        customer: { select: { name: true } },
        location: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const formatted = invoices.map((inv) => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      createdAt: inv.createdAt,
      totalAmount: inv.totalAmount,
      status: inv.status,
      customerName: inv.customer?.name ?? "-",
      locationName: inv.location?.name ?? "-",
    }));

    return NextResponse.json(formatted, { status: 200 });
  } catch (err) {
    console.error("❌ Error get invoices:", err);
    return NextResponse.json(
      { error: "Gagal mengambil daftar faktur" },
      { status: 500 }
    );
  }
}

// ✅ POST: Buat invoice baru
export async function POST(req: Request) {
  const auth = await getServerSession(authOptions);
  if (!auth?.user?.id) {
    return NextResponse.json({ error: "Autentikasi diperlukan" }, { status: 401 });
  }
  if (!hasPermission(auth.user.role, auth.user.permissions, "invoices", "create")) {
    return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
  }
  try {
    const body = await req.json();
    const {
      customerId,
      locationId,
      invoiceNumber: requestedInvoiceNumber,
      items,
      date,
      termin,
      dueDate,
      refNo,
      salesman,
      notes,
      discount = 0,
      shipping = 0,
      taxId,
      status = "unpaid",
    } = body;

    if (!customerId || !locationId || !items || items.length === 0)
      return NextResponse.json(
        { error: "Data faktur tidak lengkap" },
        { status: 400 }
      );
    if (!["paid", "unpaid"].includes(status)) {
      return NextResponse.json(
        { error: "Status pembayaran tidak valid" },
        { status: 400 }
      );
    }

    // Validasi customer & lokasi
    const [customer, location] = await Promise.all([
      prisma.customer.findUnique({ where: { id: Number(customerId) } }),
      prisma.location.findUnique({ where: { id: Number(locationId) } }),
    ]);

    if (!customer)
      return NextResponse.json(
        { error: "Pelanggan tidak ditemukan" },
        { status: 404 }
      );
    if (!location)
      return NextResponse.json(
        { error: "Lokasi tidak ditemukan" },
        { status: 404 }
      );

    // Ambil tax rate
    let taxRate = 0;
    if (taxId) {
      const tax = await prisma.tax.findUnique({ where: { id: Number(taxId) } });
      if (tax) taxRate = Number(tax.rate);
    }

    // Hitung subtotal
    let subtotal = 0;
    const invoiceItemsData = items
      .filter((item: any) => item.productId)
      .map((item: any) => {
        const itemSubtotal = (item.qty || 0) * (item.price || 0);
        subtotal += itemSubtotal;
        return {
          productId: Number(item.productId),
          qty: Number(item.qty),
          price: Number(item.price),
          subtotal: itemSubtotal,
        };
      });

    if (invoiceItemsData.length === 0)
      return NextResponse.json(
        { error: "Semua item harus memiliki productId" },
        { status: 400 }
      );

    const totalAmount =
      subtotal +
      Number(shipping) -
      Number(discount) +
      ((subtotal - Number(discount) + Number(shipping)) * taxRate) / 100;

    // Generate nomor faktur unik
    const now = new Date();
    const invoiceNumber = requestedInvoiceNumber || `INV-${now.getFullYear()}${String(
      now.getMonth() + 1
    ).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${Date.now()}`;

    // Buat invoice & jalankan pembukuan akuntansi secara atomik
    const invoice = await prisma.$transaction(async (tx) => {
      const createdInvoice = await tx.invoice.create({
        data: {
          invoiceNumber,
          customerId: Number(customerId),
          locationId: Number(locationId),
          taxId: taxId ? Number(taxId) : null,
          date: date ? new Date(date) : null,
          termin: termin === "" || termin == null ? null : Number(termin),
          refNo: refNo || null,
          salesman: salesman || null,
          notes: notes || null,
          discount,
          shipping,
          totalAmount,
          paidAmount: status === "paid" ? totalAmount : 0,
          status,
          dueDate: dueDate ? new Date(dueDate) : null,
          items: { create: invoiceItemsData },
        },
        include: {
          customer: { select: { name: true } },
          location: { select: { name: true } },
          items: true,
        },
      });

      const taxAmount = ((subtotal - Number(discount) + Number(shipping)) * taxRate) / 100;

      await processInvoiceAccounting(
        {
          invoiceId: createdInvoice.id,
          invoiceNumber: createdInvoice.invoiceNumber,
          date: date ? new Date(date) : new Date(),
          locationId: Number(locationId),
          status,
          subtotal,
          discount: Number(discount || 0),
          shipping: Number(shipping || 0),
          taxAmount,
          totalAmount,
          items: invoiceItemsData.map((i: any) => ({
            productId: i.productId,
            qty: i.qty,
          })),
        },
        tx
      );

      return createdInvoice;
    });

    return NextResponse.json(invoice, { status: 201 });
  } catch (err) {
    console.error("❌ Error create invoice:", err);
    return NextResponse.json(
      { error: "Gagal membuat faktur" },
      { status: 500 }
    );
  }
}
