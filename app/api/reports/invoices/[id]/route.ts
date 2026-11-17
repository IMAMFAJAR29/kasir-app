import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(req: Request, context: RouteContext) {
  const { id: rawId } = await context.params;
  const id = Number(rawId);

  if (!Number.isSafeInteger(id) || id <= 0) {
    return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
  }

  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      customer: true,
      location: true, // ambil nama gudang
      items: { include: { product: true } },
      tax: true,
    },
  });

  if (!invoice) {
    return NextResponse.json(
      { error: "Faktur tidak ditemukan" },
      { status: 404 }
    );
  }

  // Hitung subtotal item
  const items = invoice.items.map((i) => ({
    id: i.id,
    product: i.product,
    qty: i.qty,
    price: Number(i.price),
    subtotal: Number(i.price) * i.qty,
  }));

  return NextResponse.json({
    id: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    createdAt: invoice.createdAt,
    customer: invoice.customer,
    location: invoice.location, // kirim location
    totalAmount: Number(invoice.totalAmount), // gunakan total dari DB
    items,
    discount: Number(invoice.discount),
    shipping: Number(invoice.shipping),
    tax: invoice.tax
      ? { name: invoice.tax.name, rate: Number(invoice.tax.rate) }
      : null,
    notes: invoice.notes || null,
  });
}
