import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// ✅ GET by ID
export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
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
  try {
    const { id } = await context.params;
    const invoiceId = Number(id);
    const body = await req.json();

    const { customerId, locationId, items, taxId, discount, shipping, notes } =
      body;

    if (!items || items.length === 0)
      return NextResponse.json(
        { error: "Item tidak boleh kosong" },
        { status: 400 }
      );

    let subtotal = 0;
    const itemData = items
      .filter((i: any) => i.productId)
      .map((i: any) => {
        const sub = Number(i.qty) * Number(i.price);
        subtotal += sub;
        return {
          productId: Number(i.productId),
          qty: Number(i.qty),
          price: Number(i.price),
          subtotal: sub,
        };
      });

    let taxRate = 0;
    if (taxId) {
      const tax = await prisma.tax.findUnique({ where: { id: Number(taxId) } });
      if (tax) taxRate = Number(tax.rate);
    }

    const totalAmount =
      subtotal +
      Number(shipping || 0) -
      Number(discount || 0) +
      ((subtotal - Number(discount || 0) + Number(shipping || 0)) * taxRate) /
        100;

    const updated = await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        customerId: Number(customerId),
        locationId: Number(locationId),
        taxId: taxId ? Number(taxId) : null,
        discount: Number(discount || 0),
        shipping: Number(shipping || 0),
        notes: notes || "",
        totalAmount,
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

    return NextResponse.json(updated);
  } catch (err) {
    console.error("❌ Error update invoice:", err);
    return NextResponse.json({ error: "Gagal update faktur" }, { status: 500 });
  }
}
// ✅ DELETE: Hapus invoice by ID
export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
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
    });
    if (!invoice)
      return NextResponse.json(
        { error: "Faktur tidak ditemukan" },
        { status: 404 }
      );

    if (invoice.status === "paid")
      return NextResponse.json(
        { error: "Faktur yang sudah dibayar tidak bisa dihapus" },
        { status: 400 }
      );

    // Hapus item terkait
    await prisma.invoiceItem.deleteMany({ where: { invoiceId } });

    // Hapus invoice
    await prisma.invoice.delete({ where: { id: invoiceId } });

    return NextResponse.json(
      { message: "Faktur berhasil dihapus" },
      { status: 200 }
    );
  } catch (err) {
    console.error("❌ Error delete invoice:", err);
    return NextResponse.json(
      { error: "Gagal menghapus faktur" },
      { status: 500 }
    );
  }
}
