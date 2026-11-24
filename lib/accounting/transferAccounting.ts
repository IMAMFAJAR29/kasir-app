import { Prisma } from "@prisma/client";
import { postJournalEntry, type JournalLineInput } from "./postingService";

/**
 * Jurnal saat transfer dikirim.
 *
 * Stok gudang asal sudah berkurang; nilainya dipindahkan ke akun
 * Persediaan Dalam Perjalanan (1-1350) yang bersifat company-wide sehingga
 * tidak dibebankan ke lokasi mana pun.
 */
export async function processStockTransferSendAccounting(
  transferId: number,
  transferNo: string,
  date: Date,
  fromLocationId: number,
  totalValue: number,
  tx: Prisma.TransactionClient
) {
  if (totalValue <= 0) return;

  await postJournalEntry(
    {
      sourceType: "TRANSFER",
      sourceId: `${transferId}:SEND`,
      description: `Pengiriman Transfer Stok #${transferNo}`,
      transactionDate: date,
      lines: [
        {
          accountCode: "1-1350",
          debit: totalValue,
          credit: 0,
          description: `Persediaan Dalam Perjalanan #${transferNo}`,
        },
        {
          accountCode: "1-1300",
          debit: 0,
          credit: totalValue,
          description: `Pengeluaran Persediaan #${transferNo}`,
          locationId: fromLocationId,
        },
      ],
    },
    tx
  );
}

/**
 * Jurnal saat transfer diterima.
 *
 * Nilai yang diterima masuk ke persediaan gudang tujuan. Kekurangan barang
 * dibebankan ke akun selisih stok 5-1990. Saldo 1-1350 dikredit penuh sebesar
 * nilai yang dikirim agar akun in-transit kembali nol.
 */
export async function processStockTransferReceiveAccounting(
  transferId: number,
  transferNo: string,
  date: Date,
  toLocationId: number,
  receivedValue: number,
  shortageValue: number,
  tx: Prisma.TransactionClient
) {
  const totalValue = receivedValue + shortageValue;
  if (totalValue <= 0) return;

  const lines: JournalLineInput[] = [];

  if (receivedValue > 0) {
    lines.push({
      accountCode: "1-1300",
      debit: receivedValue,
      credit: 0,
      description: `Penerimaan Persediaan Transfer #${transferNo}`,
      locationId: toLocationId,
    });
  }

  if (shortageValue > 0) {
    lines.push({
      accountCode: "5-1990",
      debit: shortageValue,
      credit: 0,
      description: `Selisih Penerimaan Transfer #${transferNo}`,
      locationId: toLocationId,
    });
  }

  lines.push({
    accountCode: "1-1350",
    debit: 0,
    credit: totalValue,
    description: `Penyelesaian Persediaan Dalam Perjalanan #${transferNo}`,
  });

  await postJournalEntry(
    {
      sourceType: "TRANSFER",
      sourceId: `${transferId}:RECEIVE`,
      description: `Penerimaan Transfer Stok #${transferNo}`,
      transactionDate: date,
      lines,
    },
    tx
  );
}
