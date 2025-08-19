import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// ✅ CREATE transaksi baru
export async function POST(req) {
  try {
    const body = await req.json();
    const { items, method, payment, total } = body;

    if (!items || items.length === 0) {
      return NextResponse.json({ error: "Keranjang kosong" }, { status: 400 });
    }

    const sale = await prisma.Sale.create({
      data: {
        total,
        method,
        payment,
        change: method === "cash" ? payment - total : 0,
        items: {
          create: items.map((item) => ({
            productId: item.id,
            qty: item.qty,
            price: item.price,
            subtotal: item.price * item.qty,
          })),
        },
      },
      include: { items: { include: { product: true } } },
    });

    return NextResponse.json(sale, { status: 201 });
  } catch (err) {
    console.error("Error create sale:", err);
    return NextResponse.json(
      { error: "Gagal menyimpan transaksi" },
      { status: 500 }
    );
  }
}

// ✅ GET semua transaksi
export async function GET() {
  try {
    const sales = await prisma.sale.findMany({
      include: { items: { include: { product: true } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(sales);
  } catch (err) {
    console.error("Error get sales:", err);
    return NextResponse.json(
      { error: "Gagal mengambil transaksi" },
      { status: 500 }
    );
  }
}
