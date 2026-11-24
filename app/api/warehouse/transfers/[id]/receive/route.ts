import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma, { TRANSACTION_OPTIONS } from "@/lib/prisma";
import { authOptions } from "@/lib/authOptions";
import { hasPermission } from "@/lib/permissions";
import { incrementStockAtLocation } from "@/lib/productStock";
import { processStockTransferReceiveAccounting } from "@/lib/accounting/transferAccounting";

interface ReceiveInput {
  itemId: number;
  receivedQty: number;
}

/**
 * Terima transfer IN_TRANSIT.
 * Body: { items?: { itemId, receivedQty }[] }
 * Item yang tidak dikirim dianggap diterima penuh (qty).
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (
    !session?.user?.id ||
    !hasPermission(
      session.user.role,
      session.user.permissions,
      "inventoryTransfer",
      "update"
    )
  ) {
    return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
  }

  const { id } = await params;
  const transferId = Number(id);
  if (!Number.isSafeInteger(transferId) || transferId <= 0) {
    return NextResponse.json({ error: "Transfer tidak valid" }, { status: 400 });
  }

  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const source = (body ?? {}) as Record<string, unknown>;
  const rawItems = Array.isArray(source.items) ? source.items : [];
  const inputs: ReceiveInput[] = rawItems.map((item: unknown) => {
    const entry = (item ?? {}) as Record<string, unknown>;
    return {
      itemId: Number(entry.itemId),
      receivedQty: Number(entry.receivedQty),
    };
  });

  try {
    const transfer = await prisma.$transaction(async (tx) => {
      const existing = await tx.stockTransfer.findUnique({
        where: { id: transferId },
        include: {
          items: { orderBy: { id: "asc" } },
          fromLocation: { select: { id: true, name: true } },
          toLocation: { select: { id: true, name: true } },
        },
      });
      if (!existing) throw new Error("TRANSFER_NOT_FOUND");
      if (existing.status !== "IN_TRANSIT") {
        throw new Error("ALREADY_RECEIVED");
      }

      const byId = new Map(existing.items.map((item) => [item.id, item]));
      const inputByItemId = new Map<number, number>();

      for (const input of inputs) {
        if (!Number.isSafeInteger(input.itemId) || !byId.has(input.itemId)) {
          throw new Error("INVALID_ITEM");
        }
        if (
          !Number.isSafeInteger(input.receivedQty) ||
          input.receivedQty < 0
        ) {
          throw new Error("INVALID_QTY");
        }
        const sentQty = byId.get(input.itemId)!.qty;
        if (input.receivedQty > sentQty) {
          throw new Error("EXCEED_SENT_QTY");
        }
        inputByItemId.set(input.itemId, input.receivedQty);
      }

      // Klaim status lebih dahulu agar double-submit tidak memproses stok dua kali.
      const claimed = await tx.stockTransfer.updateMany({
        where: { id: transferId, status: "IN_TRANSIT" },
        data: {
          status: "RECEIVED",
          receivedAt: new Date(),
          receivedBy: session.user.id,
        },
      });
      if (claimed.count !== 1) throw new Error("ALREADY_RECEIVED");

      let receivedValue = 0;
      let shortageValue = 0;

      for (const item of existing.items) {
        const receivedQty = inputByItemId.get(item.id) ?? item.qty;
        const costPrice = Number(item.costPrice || 0);
        receivedValue += costPrice * receivedQty;
        shortageValue += costPrice * (item.qty - receivedQty);

        if (receivedQty > 0) {
          await incrementStockAtLocation(tx, {
            productId: item.productId,
            locationId: existing.toLocationId,
            qty: receivedQty,
          });
        }

        await tx.stockTransferItem.update({
          where: { id: item.id },
          data: { receivedQty },
        });
      }

      await processStockTransferReceiveAccounting(
        existing.id,
        existing.no,
        new Date(),
        existing.toLocationId,
        receivedValue,
        shortageValue,
        tx
      );

      return tx.stockTransfer.findUniqueOrThrow({
        where: { id: transferId },
        include: {
          fromLocation: { select: { id: true, name: true } },
          toLocation: { select: { id: true, name: true } },
          items: { orderBy: { id: "asc" } },
        },
      });
    }, TRANSACTION_OPTIONS);

    return NextResponse.json(transfer);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "TRANSFER_NOT_FOUND") {
      return NextResponse.json({ error: "Transfer tidak ditemukan" }, { status: 404 });
    }
    if (message === "ALREADY_RECEIVED") {
      return NextResponse.json(
        { error: "Transfer sudah diterima sebelumnya" },
        { status: 409 }
      );
    }
    if (message === "INVALID_ITEM") {
      return NextResponse.json(
        { error: "Item transfer tidak valid" },
        { status: 400 }
      );
    }
    if (message === "INVALID_QTY") {
      return NextResponse.json(
        { error: "Jumlah diterima tidak valid" },
        { status: 400 }
      );
    }
    if (message === "EXCEED_SENT_QTY") {
      return NextResponse.json(
        { error: "Jumlah diterima melebihi jumlah yang dikirim" },
        { status: 400 }
      );
    }
    console.error("Gagal menerima transfer:", error);
    return NextResponse.json(
      { error: "Gagal menerima transfer" },
      { status: 500 }
    );
  }
}
