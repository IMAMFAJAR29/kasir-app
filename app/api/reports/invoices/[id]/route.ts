import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const id = Number(params.id);

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
