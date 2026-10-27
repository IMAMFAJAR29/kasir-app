import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/authOptions";
import prisma from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { postJournalEntry } from "@/lib/accounting/postingService";

async function createSale(body, userId) {
  const { items, method, payment, cashSessionId, clientTransactionId } = body;
  if (!Array.isArray(items) || items.length === 0) {
    return { error: "Keranjang kosong", status: 400 };
  }
  if (!["cash", "qris", "transfer"].includes(method)) {
    return { error: "Metode pembayaran tidak valid", status: 400 };
  }
  if (
    typeof cashSessionId !== "string" ||
    typeof clientTransactionId !== "string" ||
    !clientTransactionId.trim()
  ) {
    return { error: "Shift kasir dan ID transaksi wajib diisi", status: 400 };
  }

  const existingSale = await prisma.sale.findUnique({
    where: { clientTransactionId },
    include: {
      items: { include: { product: true } },
      cashSession: { select: { userId: true } },
    },
  });
  if (existingSale) {
    if (existingSale.cashSession?.userId !== userId) {
      return { error: "Transaksi tidak ditemukan", status: 404 };
    }
    return { sale: existingSale, status: 200 };
  }

  const cashSession = await prisma.cashSession.findFirst({
    where: {
      id: cashSessionId,
      userId,
      closedAt: null,
    },
  });
  if (!cashSession) {
    return { error: "Shift kasir tidak aktif atau bukan milik akun ini", status: 409 };
  }

  const normalizedItems = items.map((item) => ({
    productId: Number(item.id),
    qty: Number(item.qty),
    price: Number(item.price),
  }));
  if (
    normalizedItems.some(
      (item) =>
        !Number.isSafeInteger(item.productId) ||
        item.productId <= 0 ||
        !Number.isSafeInteger(item.qty) ||
        item.qty <= 0 ||
        !Number.isFinite(item.price) ||
        item.price < 0
    )
  ) {
    return { error: "Item transaksi tidak valid", status: 400 };
  }

  const total = normalizedItems.reduce(
    (sum, item) => sum + item.price * item.qty,
    0
  );
  const paymentAmount = Number(payment);
  if (
    !Number.isFinite(paymentAmount) ||
    paymentAmount < total ||
    (method !== "cash" && paymentAmount !== total)
  ) {
    return { error: "Jumlah pembayaran tidak valid", status: 400 };
  }

  try {
    const sale = await prisma.$transaction(async (tx) => {
      const activeSession = await tx.cashSession.findFirst({
        where: { id: cashSessionId, userId, closedAt: null },
      });
      if (!activeSession) {
        throw new Error("SHIFT_CLOSED");
      }

      const createdSale = await tx.sale.create({
        data: {
          total,
          method,
          payment: paymentAmount,
          change: method === "cash" ? paymentAmount - total : 0,
          cashSessionId,
          clientTransactionId,
          items: {
            create: normalizedItems.map((item) => ({
              productId: item.productId,
              qty: item.qty,
              price: item.price,
              subtotal: item.price * item.qty,
            })),
          },
        },
        include: { items: { include: { product: true } } },
      });

      const now = new Date();
      const invoiceNumber = `INV-${now.getFullYear()}${String(
        now.getMonth() + 1
      ).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${createdSale.id}`;
      await tx.invoice.create({
        data: {
          invoiceNumber,
          saleId: createdSale.id,
          totalAmount: createdSale.total,
          paidAmount: createdSale.payment ?? 0,
          status: method === "cash" ? "paid" : "unpaid",
          items: {
            create: createdSale.items.map((item) => ({
              productId: item.productId,
              qty: item.qty,
              price: item.price,
              subtotal: item.subtotal,
            })),
          },
        },
      });
      // 1. Kurangi stok produk secara atomik
      const defaultLocation = await tx.location.findFirst({
        where: { isActive: true },
        orderBy: { id: "asc" },
      });

      for (const item of createdSale.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.qty } },
        });

        if (defaultLocation) {
          await tx.productStock.upsert({
            where: {
              productId_locationId: {
                productId: item.productId,
                locationId: defaultLocation.id,
              },
            },
            update: { quantity: { decrement: item.qty } },
            create: {
              productId: item.productId,
              locationId: defaultLocation.id,
              quantity: -item.qty,
            },
          });
        }
      }

      // 2. Hitung total HPP dan buat Jurnal Akuntansi otomatis
      let totalCost = 0;
      for (const item of createdSale.items) {
        const unitCost = Number(item.product?.costPrice || 0);
        totalCost += unitCost * item.qty;
      }

      const receiptAccountCode =
        method === "cash"
          ? "1-1001" // Kas di Tangan
          : method === "qris"
          ? "1-1003" // Kliring QRIS
          : "1-1002"; // Bank Operasional

      const journalLines = [
        {
          accountCode: receiptAccountCode,
          debit: createdSale.total,
          credit: 0,
          description: `Penerimaan POS #${createdSale.id} (${method})`,
        },
        {
          accountCode: "4-1000", // Pendapatan Penjualan Barang
          debit: 0,
          credit: createdSale.total,
          description: `Penjualan POS #${createdSale.id}`,
        },
      ];

      // Jika ada modal HPP yang dicatat
      if (totalCost > 0) {
        journalLines.push(
          {
            accountCode: "5-1000", // Beban Pokok Penjualan (HPP)
            debit: totalCost,
            credit: 0,
            description: `HPP Penjualan POS #${createdSale.id}`,
          },
          {
            accountCode: "1-1300", // Persediaan Barang Dagang
            debit: 0,
            credit: totalCost,
            description: `Pengurangan Persediaan POS #${createdSale.id}`,
          }
        );
      }

      await postJournalEntry(
        {
          sourceType: "SALE",
          sourceId: String(createdSale.id),
          description: `Penjualan Kasir POS #${createdSale.id} (${method.toUpperCase()})`,
          transactionDate: createdSale.createdAt,
          lines: journalLines,
        },
        tx
      );

      return createdSale;
    });
    return { sale, status: 201 };
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2002"
    ) {
      const duplicateSale = await prisma.sale.findUnique({
        where: { clientTransactionId },
        include: {
          items: { include: { product: true } },
          cashSession: { select: { userId: true } },
        },
      });
      if (duplicateSale) {
        if (duplicateSale.cashSession?.userId !== userId) {
          return { error: "Transaksi tidak ditemukan", status: 404 };
        }
        return { sale: duplicateSale, status: 200 };
      }
    }
    if (error instanceof Error && error.message === "SHIFT_CLOSED") {
      return { error: "Shift kasir sudah ditutup", status: 409 };
    }
    throw error;
  }
}

export async function POST(request) {
  const auth = await getServerSession(authOptions);
  if (
    !auth?.user?.id ||
    !hasPermission(auth.user.role, auth.user.permissions, "pos", "create")
  ) {
    return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
  }

  try {
    const result = await createSale(await request.json(), auth.user.id);
    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status }
      );
    }
    return NextResponse.json(result.sale, { status: result.status });
  } catch (error) {
    console.error("Gagal membuat transaksi POS:", error);
    return NextResponse.json(
      { error: "Gagal menyimpan transaksi" },
      { status: 500 }
    );
  }
}

export async function GET() {
  const auth = await getServerSession(authOptions);
  if (
    !auth?.user?.id ||
    !hasPermission(auth.user.role, auth.user.permissions, "sales", "view")
  ) {
    return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
  }

  try {
    const sales = await prisma.sale.findMany({
      include: {
        items: { include: { product: true } },
        invoice: { include: { items: { include: { product: true } } } },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(sales);
  } catch (error) {
    console.error("Gagal mengambil transaksi POS:", error);
    return NextResponse.json(
      { error: "Gagal mengambil transaksi" },
      { status: 500 }
    );
  }
}
