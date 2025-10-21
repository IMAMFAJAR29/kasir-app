import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// ✅ GET: Ambil semua invoice
export async function GET() {
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
  try {
    const body = await req.json();
    const {
      customerId,
      locationId,
      items,
      dueDate,
      refNo,
      notes,
      discount = 0,
      shipping = 0,
      taxId,
    } = body;

    if (!customerId || !locationId || !items || items.length === 0)
      return NextResponse.json(
        { error: "Data faktur tidak lengkap" },
        { status: 400 }
      );

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
      .filter((item: any) => item.productId) // ✅ pastikan productId ada
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
    const invoiceNumber = `INV-${now.getFullYear()}${String(
      now.getMonth() + 1
    ).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${Date.now()}`;

    // Buat invoice
    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        customerId: Number(customerId),
        locationId: Number(locationId),
        taxId: taxId ? Number(taxId) : null,
        refNo: refNo || null,
        notes: notes || null,
        discount,
        shipping,
        totalAmount,
        paidAmount: 0,
        status: "unpaid",
        dueDate: dueDate ? new Date(dueDate) : null,
        items: { create: invoiceItemsData },
      },
      include: {
        customer: { select: { name: true } },
        location: { select: { name: true } },
        items: true,
      },
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
