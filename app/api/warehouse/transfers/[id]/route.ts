import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma, { TRANSACTION_OPTIONS } from "@/lib/prisma";
import { authOptions } from "@/lib/authOptions";
import { hasPermission } from "@/lib/permissions";
import { incrementStockAtLocation } from "@/lib/productStock";
import { reverseJournalEntry } from "@/lib/accounting/postingService";

/**
 * Batalkan transfer yang masih IN_TRANSIT.
 * Stok dikembalikan ke gudang asal dan jurnal pengiriman dibalik.
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (
    !session?.user?.id ||
    !hasPermission(
      session.user.role,
      session.user.permissions,
      "inventoryTransfer",
      "delete"
    )
  ) {
    return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
  }

  const { id } = await params;
  const transferId = Number(id);
  if (!Number.isSafeInteger(transferId) || transferId <= 0) {
    return NextResponse.json({ error: "Transfer tidak valid" }, { status: 400 });
  }

  try {
    const transfer = await prisma.$transaction(async (tx) => {
      const existing = await tx.stockTransfer.findUnique({
        where: { id: transferId },
        include: { items: { orderBy: { id: "asc" } } },
      });
      if (!existing) throw new Error("TRANSFER_NOT_FOUND");
      if (existing.status !== "IN_TRANSIT") {
        throw new Error("CANNOT_CANCEL");
      }

      const claimed = await tx.stockTransfer.updateMany({
        where: { id: transferId, status: "IN_TRANSIT" },
        data: { status: "CANCELLED" },
      });
      if (claimed.count !== 1) throw new Error("CANNOT_CANCEL");

      for (const item of existing.items) {
        await incrementStockAtLocation(tx, {
          productId: item.productId,
          locationId: existing.fromLocationId,
          qty: item.qty,
        });
      }

      const sendJournal = await tx.journalEntry.findFirst({
        where: {
          sourceType: "TRANSFER",
          sourceId: `${transferId}:SEND`,
          isReversal: false,
          status: "POSTED",
        },
        select: { id: true },
      });
      if (sendJournal) {
        await reverseJournalEntry(
          sendJournal.id,
          `Transfer ${existing.no} dibatalkan`,
          tx
        );
      }

      return tx.stockTransfer.findUniqueOrThrow({
        where: { id: transferId },
        include: {
          fromLocation: { select: { id: true, name: true } },
          toLocation: { select: { id: true, name: true } },
        },
      });
    }, TRANSACTION_OPTIONS);

    return NextResponse.json(transfer);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "TRANSFER_NOT_FOUND") {
      return NextResponse.json({ error: "Transfer tidak ditemukan" }, { status: 404 });
    }
    if (message === "CANNOT_CANCEL") {
      return NextResponse.json(
        { error: "Transfer sudah diterima atau dibatalkan" },
        { status: 409 }
      );
    }
    console.error("Gagal membatalkan transfer:", error);
    return NextResponse.json(
      { error: "Gagal membatalkan transfer" },
      { status: 500 }
    );
  }
}
