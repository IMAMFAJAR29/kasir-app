import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { authorizePurchaseReceipt } from "@/lib/purchaseReceiptAuth";

export async function GET() {
  const authorization = await authorizePurchaseReceipt("view");
  if (!authorization.authorized) return authorization.response;

  try {
    const receipts = await prisma.purchaseReceipt.findMany({
      include: {
        purchase: {
          select: {
            purchaseNumber: true,
            supplier: { select: { name: true } },
            location: { select: { name: true } },
          },
        },
        _count: { select: { items: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(receipts);
  } catch (error) {
    console.error("Gagal mengambil penerimaan barang:", error);
    return NextResponse.json(
      { error: "Gagal mengambil riwayat penerimaan barang" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const authorization = await authorizePurchaseReceipt("create");
  if (!authorization.authorized) return authorization.response;

  let requestKey = "";
  try {
    const body = await request.json();
    const purchaseId = Number(body.purchaseId);
    requestKey =
      typeof body.requestKey === "string" ? body.requestKey.trim() : "";

    if (!Number.isSafeInteger(purchaseId) || purchaseId <= 0) {
      return NextResponse.json(
        { error: "Nomor pembelian tidak valid" },
        { status: 400 }
      );
    }
    if (!/^[0-9a-f-]{36}$/i.test(requestKey)) {
      return NextResponse.json(
        { error: "Kunci permintaan penerimaan tidak valid" },
        { status: 400 }
      );
    }

    const existingRequest = await prisma.purchaseReceipt.findUnique({
      where: { requestKey },
    });
    if (existingRequest) {
      return NextResponse.json(existingRequest, { status: 200 });
    }

    const purchase = await prisma.purchase.findUnique({
      where: { id: purchaseId },
      include: {
        items: { include: { product: { select: { id: true, name: true, sku: true } } } },
        receipts: {
          where: { status: "COMPLETED" },
          select: {
            items: {
              where: { productMatches: true },
              select: { purchaseItemId: true, receivedQty: true },
            },
          },
        },
      },
    });

    if (!purchase) {
      return NextResponse.json(
        { error: "Pembelian tidak ditemukan" },
        { status: 404 }
      );
    }
    if (purchase.items.length === 0) {
      return NextResponse.json(
        { error: "Pembelian belum memiliki produk" },
        { status: 400 }
      );
    }

    const previouslyReceived = new Map<number, number>();
    for (const receipt of purchase.receipts) {
      for (const item of receipt.items) {
        previouslyReceived.set(
          item.purchaseItemId,
          (previouslyReceived.get(item.purchaseItemId) ?? 0) + item.receivedQty
        );
      }
    }

    const now = new Date();
    const receiptNumber = `SJ-${now.toISOString().slice(0, 10).replaceAll("-", "")}-${randomUUID()
      .slice(0, 8)
      .toUpperCase()}`;

    const receipt = await prisma.purchaseReceipt.create({
      data: {
        receiptNumber,
        requestKey,
        purchaseId,
        receivedBy: authorization.user.name ?? authorization.user.email,
        items: {
          create: purchase.items.map((item) => {
            const receivedQty = previouslyReceived.get(item.id) ?? 0;
            return {
              purchaseItemId: item.id,
              productId: item.productId,
              expectedProductName: item.product.name,
              expectedSku: item.product.sku,
              orderedQty: item.qty,
              remainingQtyAtReceipt: Math.max(0, item.qty - receivedQty),
              deliveryQty: Math.max(0, item.qty - receivedQty),
              receivedQty: 0,
              productMatches: true,
              qcStatus: "PENDING",
            };
          }),
        },
      },
      include: {
        purchase: {
          select: {
            purchaseNumber: true,
            supplier: { select: { name: true } },
            location: { select: { name: true } },
          },
        },
        items: true,
      },
    });

    return NextResponse.json(receipt, { status: 201 });
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2002"
    ) {
      try {
        const duplicate = await prisma.purchaseReceipt.findUnique({
          where: { requestKey },
        });
        if (duplicate) return NextResponse.json(duplicate, { status: 200 });
      } catch (lookupError) {
        console.error("Gagal memeriksa pengiriman penerimaan berulang:", lookupError);
      }
    }

    console.error("Gagal membuat penerimaan barang:", error);
    return NextResponse.json(
      { error: "Gagal membuat penerimaan barang" },
      { status: 500 }
    );
  }
}
