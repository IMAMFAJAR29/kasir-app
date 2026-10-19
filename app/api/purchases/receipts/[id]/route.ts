import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { authorizePurchaseReceipt } from "@/lib/purchaseReceiptAuth";
import { evaluateReceiptLine } from "@/lib/purchaseReceiving";

const receiptInclude = {
  purchase: {
    include: {
      supplier: { select: { name: true, phone: true, address: true } },
      location: { select: { name: true } },
    },
  },
  items: {
    include: {
      product: { select: { id: true, name: true, sku: true } },
      actualProduct: { select: { id: true, name: true, sku: true } },
    },
    orderBy: { id: "asc" as const },
  },
};

type RouteContext = { params: Promise<{ id: string }> };

async function parseReceiptId(context: RouteContext) {
  const { id } = await context.params;
  const receiptId = Number(id);
  return Number.isSafeInteger(receiptId) && receiptId > 0 ? receiptId : null;
}

export async function GET(_request: Request, context: RouteContext) {
  const authorization = await authorizePurchaseReceipt("view");
  if (!authorization.authorized) return authorization.response;

  const receiptId = await parseReceiptId(context);
  if (!receiptId) {
    return NextResponse.json(
      { error: "ID penerimaan tidak valid" },
      { status: 400 }
    );
  }

  try {
    const [receipt, products] = await Promise.all([
      prisma.purchaseReceipt.findUnique({
        where: { id: receiptId },
        include: receiptInclude,
      }),
      prisma.product.findMany({
        select: { id: true, name: true, sku: true },
        orderBy: { name: "asc" },
      }),
    ]);

    if (!receipt) {
      return NextResponse.json(
        { error: "Penerimaan barang tidak ditemukan" },
        { status: 404 }
      );
    }

    return NextResponse.json({ ...receipt, productOptions: products });
  } catch (error) {
    console.error("Gagal mengambil detail penerimaan barang:", error);
    return NextResponse.json(
      { error: "Gagal mengambil detail penerimaan barang" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const authorization = await authorizePurchaseReceipt("update");
  if (!authorization.authorized) return authorization.response;

  const receiptId = await parseReceiptId(context);
  if (!receiptId) {
    return NextResponse.json(
      { error: "ID penerimaan tidak valid" },
      { status: 400 }
    );
  }

  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json(
        { error: "Data penerimaan tidak valid" },
        { status: 400 }
      );
    }
    const payload = body as Record<string, unknown>;
    const action = payload.action;
    if (
      typeof action !== "string" ||
      !["save", "submit_qc", "complete_qc", "complete"].includes(action)
    ) {
      return NextResponse.json(
        { error: "Aksi penerimaan tidak valid" },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const receipt = await tx.purchaseReceipt.findUnique({
        where: { id: receiptId },
        include: {
          purchase: { select: { locationId: true } },
          items: { orderBy: { id: "asc" } },
        },
      });
      if (!receipt) return { error: "Penerimaan barang tidak ditemukan", status: 404 };

      if (action === "complete") {
        if (receipt.status !== "QC_COMPLETED" || receipt.stockPostedAt) {
          return {
            error: "Penerimaan belum siap diselesaikan atau sudah diproses",
            status: 409,
          };
        }
        const locationId = receipt.purchase.locationId;
        if (locationId === null) {
          return {
            error: "Pembelian belum memiliki lokasi gudang tujuan",
            status: 409,
          };
        }

        const discrepancies = receipt.items.filter(
          (item) =>
            item.qcStatus !== "MATCH" ||
            item.orderDifference > 0 ||
            (item.receivedQty > 0 &&
              !item.productMatches &&
              !item.actualProductId)
        );
        if (discrepancies.length > 0 && payload.confirmDiscrepancies !== true) {
          return {
            error:
              "Ada selisih QC. Tinjau setiap baris dan konfirmasikan selisih sebelum menyelesaikan penerimaan.",
            status: 409,
            discrepancies: discrepancies.map((item) => ({
              id: item.id,
              qcStatus: item.qcStatus,
              difference: item.difference,
              orderDifference: item.orderDifference,
              productMatches: item.productMatches,
              actualProductName: item.actualProductName,
            })),
          };
        }

        // Serialize receipt finalization per purchase so concurrent receipts cannot
        // both pass the cumulative ordered-quantity check.
        await tx.$queryRaw<Array<{ id: number }>>`
          SELECT "id" FROM "purchases" WHERE "id" = ${receipt.purchaseId} FOR UPDATE
        `;

        let cumulativeOverage = false;
        for (const item of receipt.items) {
          if (!item.productMatches) continue;
          const previous = await tx.purchaseReceiptItem.aggregate({
            where: {
              purchaseItemId: item.purchaseItemId,
              productMatches: true,
              receiptId: { not: receipt.id },
              receipt: { status: "COMPLETED" },
            },
            _sum: { receivedQty: true },
          });
          if (
            (previous._sum.receivedQty ?? 0) + item.receivedQty >
            item.orderedQty
          ) {
            cumulativeOverage = true;
          }
        }
        if (cumulativeOverage && payload.confirmDiscrepancies !== true) {
          return {
            error:
              "Total penerimaan melampaui qty pembelian karena penerimaan lain telah diselesaikan. Konfirmasikan selisih untuk melanjutkan.",
            status: 409,
          };
        }

        const claimed = await tx.purchaseReceipt.updateMany({
          where: {
            id: receipt.id,
            status: "QC_COMPLETED",
            stockPostedAt: null,
          },
          data: {
            status: "COMPLETED",
            completedAt: new Date(),
            stockPostedAt: new Date(),
          },
        });
        if (claimed.count !== 1) {
          return {
            error: "Penerimaan sudah diproses oleh permintaan lain",
            status: 409,
          };
        }

        for (const item of receipt.items) {
          if (item.receivedQty <= 0) continue;

          const stockProductId = item.productMatches
            ? item.productId
            : item.actualProductId;
          if (!stockProductId) continue;

          await tx.product.update({
            where: { id: stockProductId },
            data: { stock: { increment: item.receivedQty } },
          });
          await tx.productStock.upsert({
            where: {
              productId_locationId: {
                productId: stockProductId,
                locationId,
              },
            },
            update: { quantity: { increment: item.receivedQty } },
            create: {
              productId: stockProductId,
              locationId,
              quantity: item.receivedQty,
            },
          });
        }

        return {
          receipt: await tx.purchaseReceipt.findUnique({
            where: { id: receipt.id },
            include: receiptInclude,
          }),
        };
      }

      if (
        action === "complete_qc" &&
        receipt.status !== "PENDING_QC"
      ) {
        return {
          error: "Hanya penerimaan yang menunggu QC dapat diperiksa",
          status: 409,
        };
      }
      if (
        (action === "save" || action === "submit_qc") &&
        !["DRAFT", "PENDING_QC"].includes(receipt.status)
      ) {
        return {
          error: "Penerimaan pada status ini tidak dapat diubah",
          status: 409,
        };
      }

      if (
        !Array.isArray(payload.items) ||
        payload.items.length !== receipt.items.length
      ) {
        return {
          error: "Semua produk dari pembelian harus diperiksa",
          status: 400,
        };
      }

      const submittedItems = new Map<number, Record<string, unknown>>();
      for (const line of payload.items) {
        if (!line || typeof line !== "object" || Array.isArray(line)) {
          return {
            error: "Baris produk penerimaan tidak valid",
            status: 400,
          };
        }
        const lineData = line as Record<string, unknown>;
        const lineId = Number(lineData.id);
        const deliveryQty = Number(lineData.deliveryQty);
        const receivedQty = Number(lineData.receivedQty);
        const actualProductId =
          lineData.actualProductId === "" ||
          lineData.actualProductId === null ||
          lineData.actualProductId === undefined
            ? null
            : Number(lineData.actualProductId);

        if (
          !Number.isSafeInteger(lineId) ||
          !Number.isSafeInteger(deliveryQty) ||
          deliveryQty < 0 ||
          !Number.isSafeInteger(receivedQty) ||
          receivedQty < 0 ||
          typeof lineData.productMatches !== "boolean" ||
          (actualProductId !== null &&
            (!Number.isSafeInteger(actualProductId) || actualProductId <= 0)) ||
          (lineData.productMatches && actualProductId !== null) ||
          (!lineData.productMatches &&
            receivedQty > 0 &&
            actualProductId === null &&
            (typeof lineData.actualProductName !== "string" ||
              !lineData.actualProductName.trim()))
        ) {
          return { error: "Qty atau data produk penerimaan tidak valid", status: 400 };
        }
        if (submittedItems.has(lineId)) {
          return { error: "Produk penerimaan tercantum lebih dari sekali", status: 400 };
        }
        submittedItems.set(lineId, {
          deliveryQty,
          receivedQty,
          productMatches: lineData.productMatches,
          actualProductId,
          actualProductName:
            typeof lineData.actualProductName === "string"
              ? lineData.actualProductName.trim().slice(0, 200)
              : "",
          notes:
            typeof lineData.notes === "string"
              ? lineData.notes.trim().slice(0, 1000)
              : "",
        });
      }

      if (receipt.items.some((item) => !submittedItems.has(item.id))) {
        return {
          error: "Produk penerimaan tidak sesuai dengan detail pembelian",
          status: 400,
        };
      }

      const actualProductIds = [
        ...new Set(
          [...submittedItems.values()]
            .map((line) => line.actualProductId)
            .filter((id): id is number => typeof id === "number")
        ),
      ];
      const actualProducts =
        actualProductIds.length > 0
          ? await tx.product.findMany({
              where: { id: { in: actualProductIds } },
              select: { id: true, name: true },
            })
          : [];
      const productById = new Map(actualProducts.map((product) => [product.id, product]));
      if (actualProductIds.some((id) => !productById.has(id))) {
        return { error: "Produk aktual tidak ditemukan", status: 400 };
      }

      const normalizedItems = receipt.items.map((item) => {
        const submitted = submittedItems.get(item.id)!;
        const actualProductId = submitted.actualProductId as number | null;
        const actualProduct = actualProductId
          ? productById.get(actualProductId)
          : null;
        const productMatches = submitted.productMatches as boolean;
        const actualProductName = productMatches
          ? null
          : actualProduct?.name ||
            (submitted.actualProductName as string) ||
            null;
        return {
          id: item.id,
          purchaseItemId: item.purchaseItemId,
          deliveryQty: submitted.deliveryQty as number,
          receivedQty: submitted.receivedQty as number,
          productMatches,
          actualProductId,
          actualProductName,
          notes: submitted.notes as string,
          orderDifference:
            (submitted.deliveryQty as number) - item.remainingQtyAtReceipt,
        };
      });

      if (
        action !== "save" &&
        normalizedItems.every(
          (item) => item.deliveryQty === 0 && item.receivedQty === 0
        )
      ) {
        return {
          error: "Masukkan qty pada Surat Jalan sebelum melanjutkan",
          status: 400,
        };
      }

      const supplierDeliveryNumber =
        typeof payload.supplierDeliveryNumber === "string"
          ? payload.supplierDeliveryNumber.trim().slice(0, 100)
          : "";
      const notes =
        typeof payload.notes === "string"
          ? payload.notes.trim().slice(0, 2000)
          : null;
      const receivedAt =
        typeof payload.receivedAt === "string" && payload.receivedAt
          ? new Date(payload.receivedAt)
          : receipt.receivedAt;
      if (Number.isNaN(receivedAt.getTime())) {
        return { error: "Tanggal penerimaan tidak valid", status: 400 };
      }
      if (action !== "save" && !supplierDeliveryNumber) {
        return {
          error: "Nomor Surat Jalan pemasok wajib diisi untuk proses QC",
          status: 400,
        };
      }

      for (const item of normalizedItems) {
        const qc = evaluateReceiptLine(
          item.deliveryQty,
          item.receivedQty,
          item.productMatches
        );
        await tx.purchaseReceiptItem.update({
          where: { id: item.id },
          data: {
            deliveryQty: item.deliveryQty,
            receivedQty: item.receivedQty,
            productMatches: item.productMatches,
            actualProductId: item.actualProductId,
            actualProductName: item.actualProductName,
            difference: qc.difference,
            orderDifference: item.orderDifference,
            qcStatus:
              action === "complete_qc" ? qc.qcStatus : "PENDING",
            notes: item.notes || null,
          },
        });
      }

      await tx.purchaseReceipt.update({
        where: { id: receipt.id },
        data: {
          supplierDeliveryNumber: supplierDeliveryNumber || null,
          receivedAt,
          notes,
          ...(action === "submit_qc" ? { status: "PENDING_QC" } : {}),
          ...(action === "complete_qc"
            ? {
                status: "QC_COMPLETED",
                qcBy: authorization.user.name ?? authorization.user.email,
                qcCompletedAt: new Date(),
              }
            : {}),
        },
      });

      return {
        receipt: await tx.purchaseReceipt.findUnique({
          where: { id: receipt.id },
          include: receiptInclude,
        }),
      };
    });

    if ("error" in result) {
      return NextResponse.json(
        {
          error: result.error,
          ...("discrepancies" in result
            ? { discrepancies: result.discrepancies }
            : {}),
        },
        { status: result.status }
      );
    }
    return NextResponse.json(result.receipt);
  } catch (error) {
    console.error("Gagal memperbarui penerimaan barang:", error);
    return NextResponse.json(
      { error: "Gagal memperbarui penerimaan barang" },
      { status: 500 }
    );
  }
}
