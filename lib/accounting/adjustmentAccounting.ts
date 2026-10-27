import { Prisma } from "@prisma/client";
import { postJournalEntry } from "./postingService";

export interface StockAdjustmentLineInput {
  productId: number;
  difference: number;
}

export async function processStockAdjustmentAccounting(
  adjustmentId: number,
  adjustmentNo: string,
  date: Date,
  locationId: number,
  items: StockAdjustmentLineInput[],
  tx: Prisma.TransactionClient
) {
  let totalLossValue = 0;
  let totalSurplusValue = 0;

  for (const item of items) {
    if (item.difference === 0) continue;

    const product = await tx.product.findUnique({
      where: { id: item.productId },
      select: { costPrice: true },
    });

    const costPrice = Number(product?.costPrice || 0);
    const value = Math.abs(item.difference) * costPrice;

    if (value <= 0) continue;

    if (item.difference < 0) {
      // Barang hilang / rusak / berkurang
      totalLossValue += value;
    } else {
      // Barang bertambah / surplus
      totalSurplusValue += value;
    }
  }

  const lines = [];

  // 1. Selisih Kurang (Loss)
  if (totalLossValue > 0) {
    lines.push(
      {
        accountCode: "5-1990", // Beban Selisih Stok
        debit: totalLossValue,
        credit: 0,
        description: `Beban Selisih Stok Kurang #${adjustmentNo}`,
        locationId,
      },
      {
        accountCode: "1-1300", // Persediaan Barang Dagang
        debit: 0,
        credit: totalLossValue,
        description: `Pengurangan Persediaan #${adjustmentNo}`,
        locationId,
      }
    );
  }

  // 2. Selisih Lebih (Surplus)
  if (totalSurplusValue > 0) {
    lines.push(
      {
        accountCode: "1-1300", // Persediaan Barang Dagang
        debit: totalSurplusValue,
        credit: 0,
        description: `Penambahan Persediaan Surplus #${adjustmentNo}`,
        locationId,
      },
      {
        accountCode: "5-1990", // Pengurang Beban / Pendapatan Selisih Stok
        debit: 0,
        credit: totalSurplusValue,
        description: `Koreksi Surplus Stok #${adjustmentNo}`,
        locationId,
      }
    );
  }

  if (lines.length > 0) {
    await postJournalEntry(
      {
        sourceType: "ADJUSTMENT",
        sourceId: String(adjustmentId),
        description: `Penyesuaian Stok (Stock Opname) #${adjustmentNo}`,
        transactionDate: date,
        lines,
      },
      tx
    );
  }
}

