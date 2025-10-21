import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

/**
 * ✅ CREATE transaksi baru (POS) + otomatis buat invoice
 */
export async function POST(req) {
  try {
    const body = await req.json();
    const { items, method, payment, total } = body;

    if (!items || items.length === 0) {
      return NextResponse.json({ error: "Keranjang kosong" }, { status: 400 });
    }

    // 💾 Simpan transaksi POS
    const sale = await prisma.sale.create({
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

    // 🧾 Buat invoice otomatis setelah Sale berhasil
    try {
      const now = new Date();
      const invoiceNumber = `INV-${now.getFullYear()}${String(
        now.getMonth() + 1
      ).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${sale.id}`;

      await prisma.invoice.create({
        data: {
          invoiceNumber,
          saleId: sale.id,
          totalAmount: sale.total,
          paidAmount: sale.payment ?? 0,
          status: method === "cash" ? "paid" : "unpaid",
          items: {
            create: sale.items.map((item) => ({
              productId: item.productId,
              qty: item.qty,
              price: item.price,
              subtotal: item.subtotal,
            })),
          },
        },
      });
    } catch (err) {
      console.error("Gagal membuat faktur otomatis:", err);
    }

    return NextResponse.json(sale, { status: 201 });
  } catch (err) {
    console.error("❌ Error create sale:", err);
    return NextResponse.json(
      { error: "Gagal menyimpan transaksi" },
      { status: 500 }
    );
  }
}

/**
 * ✅ GET semua transaksi POS
 */
export async function GET() {
  try {
    const sales = await prisma.sale.findMany({
      include: {
        items: { include: { product: true } },
        invoice: { include: { items: { include: { product: true } } } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(sales);
  } catch (err) {
    console.error("❌ Error get sales:", err);
    return NextResponse.json(
      { error: "Gagal mengambil transaksi" },
      { status: 500 }
    );
  }
}
