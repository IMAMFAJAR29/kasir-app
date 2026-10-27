import { Prisma } from "@prisma/client";
import { postJournalEntry } from "./postingService";

export interface InvoiceAccountingParams {
  invoiceId: number;
  invoiceNumber: string;
  date: Date;
  locationId: number;
  status: "paid" | "unpaid";
  subtotal: number;
  discount: number;
  shipping: number;
  taxAmount: number;
  totalAmount: number;
  items: Array<{ productId: number; qty: number }>;
}

export async function processInvoiceAccounting(
  params: InvoiceAccountingParams,
  tx: Prisma.TransactionClient
) {
  const {
    invoiceId,
    invoiceNumber,
    date,
    locationId,
    status,
    subtotal,
    discount,
    shipping,
    taxAmount,
    totalAmount,
    items,
  } = params;

  // 1. Kurangi stok barang
  let totalCost = 0;
  for (const item of items) {
    const product = await tx.product.findUnique({
      where: { id: item.productId },
      select: { costPrice: true },
    });

    const costPrice = Number(product?.costPrice || 0);
    totalCost += costPrice * item.qty;

    await tx.product.update({
      where: { id: item.productId },
      data: { stock: { decrement: item.qty } },
    });

    await tx.productStock.upsert({
      where: {
        productId_locationId: { productId: item.productId, locationId },
      },
      update: { quantity: { decrement: item.qty } },
      create: {
        productId: item.productId,
        locationId,
        quantity: -item.qty,
      },
    });
  }

  // 2. Baris Jurnal Penjualan / Piutang
  const revenueAmount = subtotal + shipping;
  const journalLines = [];

  if (status === "paid") {
    // Penjualan tunai lunas
    journalLines.push({
      accountCode: "1-1001", // Kas di Tangan
      debit: totalAmount,
      credit: 0,
      description: `Penerimaan Lunas Faktur #${invoiceNumber}`,
      locationId,
    });
  } else {
    // Penjualan tempo / piutang
    journalLines.push({
      accountCode: "1-1200", // Piutang Usaha
      debit: totalAmount,
      credit: 0,
      description: `Piutang Faktur Penjualan #${invoiceNumber}`,
      locationId,
    });
  }

  if (discount > 0) {
    journalLines.push({
      accountCode: "4-1090", // Potongan Penjualan
      debit: discount,
      credit: 0,
      description: `Diskon Faktur #${invoiceNumber}`,
      locationId,
    });
  }

  journalLines.push({
    accountCode: "4-1000", // Pendapatan Penjualan
    debit: 0,
    credit: revenueAmount,
    description: `Pendapatan Faktur #${invoiceNumber}`,
    locationId,
  });

  if (taxAmount > 0) {
    journalLines.push({
      accountCode: "2-1200", // Hutang PPN Keluaran
      debit: 0,
      credit: taxAmount,
      description: `PPN Keluaran Faktur #${invoiceNumber}`,
      locationId,
    });
  }

  // Jurnal HPP & Persediaan (jika ada HPP)
  if (totalCost > 0) {
    journalLines.push(
      {
        accountCode: "5-1000", // HPP
        debit: totalCost,
        credit: 0,
        description: `HPP Faktur #${invoiceNumber}`,
        locationId,
      },
      {
        accountCode: "1-1300", // Persediaan Barang Dagang
        debit: 0,
        credit: totalCost,
        description: `Pengurangan Persediaan Faktur #${invoiceNumber}`,
        locationId,
      }
    );
  }

  await postJournalEntry(
    {
      sourceType: "INVOICE",
      sourceId: String(invoiceId),
      description: `Faktur Penjualan #${invoiceNumber} (${status.toUpperCase()})`,
      transactionDate: date,
      lines: journalLines,
    },
    tx
  );
}

