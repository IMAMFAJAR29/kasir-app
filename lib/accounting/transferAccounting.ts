import { Prisma } from "@prisma/client";
import { postJournalEntry } from "./postingService";

export interface StockTransferLineInput {
  productId: number;
  qty: number;
  costPrice: number;
}

/**
 * Jurnal perpindahan persediaan antar gudang.
 *
 * Nilai persediaan berpindah dari lokasi asal ke lokasi tujuan pada akun yang
 * sama (1-1300). Debit di tujuan dan kredit di asal membuat total nilai
 * persediaan perusahaan tidak berubah, tetapi buku besar per lokasi tetap
 * akurat.
 */
export async function processStockTransferAccounting(
  transferId: number,
  transferNo: string,
  date: Date,
  fromLocationId: number,
  toLocationId: number,
  items: StockTransferLineInput[],
  tx: Prisma.TransactionClient
) {
  const totalValue = items.reduce(
    (sum, item) => sum + item.qty * item.costPrice,
    0
  );

  if (totalValue <= 0) return;

  await postJournalEntry(
    {
      sourceType: "TRANSFER",
      sourceId: String(transferId),
      description: `Transfer Stok Antar Gudang #${transferNo}`,
      transactionDate: date,
      lines: [
        {
          accountCode: "1-1300", // Persediaan Barang Dagang
          debit: totalValue,
          credit: 0,
          description: `Penerimaan Persediaan Transfer #${transferNo}`,
          locationId: toLocationId,
        },
        {
          accountCode: "1-1300", // Persediaan Barang Dagang
          debit: 0,
          credit: totalValue,
          description: `Pengeluaran Persediaan Transfer #${transferNo}`,
          locationId: fromLocationId,
        },
      ],
    },
    tx
  );
}
