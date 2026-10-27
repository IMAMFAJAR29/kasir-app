import { Prisma } from "@prisma/client";
import { postJournalEntry } from "./postingService";

export async function processPurchaseReceiptAccounting(
  receiptId: number,
  locationId: number,
  tx: Prisma.TransactionClient
) {
  const receipt = await tx.purchaseReceipt.findUnique({
    where: { id: receiptId },
    include: {
      items: {
        include: {
          purchaseItem: { select: { price: true } },
          product: { select: { id: true, stock: true, costPrice: true } },
        },
      },
    },
  });

  if (!receipt) return;

  let totalReceiptValue = 0;

  for (const item of receipt.items) {
    if (item.receivedQty <= 0) continue;

    const productId = item.productMatches ? item.productId : item.actualProductId;
    if (!productId) continue;

    const purchasePrice = Number(item.purchaseItem?.price || 0);
    const itemTotal = purchasePrice * item.receivedQty;
    totalReceiptValue += itemTotal;

    // Perbarui moving weighted average cost price
    const currentProd = await tx.product.findUnique({
      where: { id: productId },
      select: { stock: true, costPrice: true },
    });

    if (currentProd && purchasePrice > 0) {
      const currentStock = currentProd.stock > 0 ? currentProd.stock : 0;
      const currentCost = Number(currentProd.costPrice || 0);
      const newStock = currentStock + item.receivedQty;

      const newCostPrice =
        newStock > 0
          ? (currentStock * currentCost + item.receivedQty * purchasePrice) / newStock
          : purchasePrice;

      await tx.product.update({
        where: { id: productId },
        data: {
          costPrice: newCostPrice > 0 ? newCostPrice : purchasePrice,
        },
      });
    }
  }

  // Jurnal Akuntansi Persediaan Masuk (Perpetual)
  if (totalReceiptValue > 0) {
    await postJournalEntry(
      {
        sourceType: "RECEIPT",
        sourceId: String(receipt.id),
        description: `Penerimaan Barang #${receipt.receiptNumber} (${receipt.supplierDeliveryNumber || "Surat Jalan"})`,
        transactionDate: receipt.receivedAt || new Date(),
        lines: [
          {
            accountCode: "1-1300", // Persediaan Barang Dagang
            debit: totalReceiptValue,
            credit: 0,
            description: `Persediaan Masuk #${receipt.receiptNumber}`,
            locationId,
          },
          {
            accountCode: "1-1399", // Persediaan Belum Ditagih (GRNI)
            debit: 0,
            credit: totalReceiptValue,
            description: `Akrual GRNI #${receipt.receiptNumber}`,
            locationId,
          },
        ],
      },
      tx
    );
  }
}

