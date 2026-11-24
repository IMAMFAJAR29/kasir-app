import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma, { TRANSACTION_OPTIONS } from "@/lib/prisma";
import { authOptions } from "@/lib/authOptions";
import { hasPermission } from "@/lib/permissions";
import {
  getLocationStockQuantity,
  setStockAtLocation,
  InvalidStockError,
} from "@/lib/productStock";
import { processStockAdjustmentAccounting } from "@/lib/accounting/adjustmentAccounting";
import { getUserNameMap, OPNAME_STATUS } from "@/lib/inventoryOpname";

interface CountedItem {
  productId: number;
  countedQty: number;
}

async function loadOpname(id: number) {
  return prisma.stockOpname.findUnique({
    where: { id },
    include: {
      location: { select: { id: true, name: true } },
      items: {
        orderBy: { id: "asc" },
        include: { product: { select: { name: true, sku: true } } },
      },
    },
  });
}

async function serializeOpname(id: number) {
  const opname = await loadOpname(id);
  if (!opname) return null;
  const names = await getUserNameMap(prisma, [
    opname.createdBy,
    opname.submittedBy,
    opname.approvedBy,
  ]);
  const increase = opname.items.reduce(
    (sum, item) => sum + (item.difference > 0 ? item.difference : 0),
    0
  );
  const decrease = opname.items.reduce(
    (sum, item) => sum + (item.difference < 0 ? Math.abs(item.difference) : 0),
    0
  );
  return {
    id: opname.id,
    no: opname.no,
    status: opname.status,
    note: opname.note,
    rejectionNote: opname.rejectionNote,
    location: opname.location,
    createdBy: opname.createdBy,
    createdByName: names.get(opname.createdBy) ?? null,
    submittedByName: opname.submittedBy
      ? names.get(opname.submittedBy) ?? null
      : null,
    approvedByName: opname.approvedBy
      ? names.get(opname.approvedBy) ?? null
      : null,
    approvedAt: opname.approvedAt,
    postedAt: opname.postedAt,
    createdAt: opname.createdAt,
    itemCount: opname.items.length,
    increase,
    decrease,
    net: increase - decrease,
    items: opname.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      name: item.product?.name ?? `Produk #${item.productId}`,
      sku: item.product?.sku ?? "-",
      systemQty: item.systemQty,
      countedQty: item.countedQty,
      difference: item.difference,
    })),
  };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (
    !session?.user?.id ||
    !hasPermission(session.user.role, session.user.permissions, "inventoryOpname", "view")
  ) {
    return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
  }

  const { id } = await params;
  const opnameId = Number(id);
  if (!Number.isSafeInteger(opnameId) || opnameId <= 0) {
    return NextResponse.json({ error: "Opname tidak valid" }, { status: 400 });
  }

  const result = await serializeOpname(opnameId);
  if (!result) {
    return NextResponse.json({ error: "Opname tidak ditemukan" }, { status: 404 });
  }
  return NextResponse.json(result);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (
    !session?.user?.id ||
    !hasPermission(session.user.role, session.user.permissions, "inventoryOpname", "delete")
  ) {
    return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
  }

  const { id } = await params;
  const opnameId = Number(id);
  if (!Number.isSafeInteger(opnameId) || opnameId <= 0) {
    return NextResponse.json({ error: "Opname tidak valid" }, { status: 400 });
  }

  const opname = await prisma.stockOpname.findUnique({
    where: { id: opnameId },
    select: { id: true, status: true },
  });
  if (!opname) {
    return NextResponse.json({ error: "Opname tidak ditemukan" }, { status: 404 });
  }
  if (opname.status !== "DRAFT") {
    return NextResponse.json(
      { error: "Hanya draft opname yang dapat dihapus" },
      { status: 409 }
    );
  }

  try {
    await prisma.stockOpname.delete({ where: { id: opnameId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Gagal menghapus opname:", error);
    return NextResponse.json(
      { error: "Gagal menghapus opname" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (
    !session?.user?.id ||
    !hasPermission(session.user.role, session.user.permissions, "inventoryOpname", "view")
  ) {
    return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
  }

  const { id } = await params;
  const opnameId = Number(id);
  if (!Number.isSafeInteger(opnameId) || opnameId <= 0) {
    return NextResponse.json({ error: "Opname tidak valid" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Data permintaan tidak valid" }, { status: 400 });
  }
  const source = (body ?? {}) as Record<string, unknown>;
  const action = typeof source.action === "string" ? source.action : "";
  const note = typeof source.note === "string" ? source.note.trim() || null : null;

  const opname = await loadOpname(opnameId);
  if (!opname) {
    return NextResponse.json({ error: "Opname tidak ditemukan" }, { status: 404 });
  }

  const canUpdate = hasPermission(
    session.user.role,
    session.user.permissions,
    "inventoryOpname",
    "update"
  );
  const canCreate = hasPermission(
    session.user.role,
    session.user.permissions,
    "inventoryOpname",
    "create"
  );
  const canApprove = hasPermission(
    session.user.role,
    session.user.permissions,
    "inventoryOpname",
    "approve"
  );
  const isCreator = opname.createdBy === session.user.id;

  try {
    if (action === "update") {
      if (!canUpdate && !(isCreator && canCreate)) {
        return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
      }
      if (opname.status !== OPNAME_STATUS.DRAFT) {
        return NextResponse.json(
          { error: "Hanya draft yang dapat diubah" },
          { status: 409 }
        );
      }

      const rawItems = Array.isArray(source.items) ? source.items : [];
      const counted: CountedItem[] = rawItems.map((item: unknown) => {
        const entry = (item ?? {}) as Record<string, unknown>;
        return {
          productId: Number(entry.productId),
          countedQty: Number(entry.countedQty),
        };
      });
      if (
        counted.length === 0 ||
        counted.some(
          (item) =>
            !Number.isSafeInteger(item.productId) ||
            item.productId <= 0 ||
            !Number.isSafeInteger(item.countedQty) ||
            item.countedQty < 0
        )
      ) {
        return NextResponse.json(
          { error: "Daftar hasil hitung tidak valid" },
          { status: 400 }
        );
      }

      await prisma.$transaction(async (tx) => {
        await tx.stockOpnameItem.deleteMany({ where: { opnameId } });
        for (const item of counted) {
          const systemQty = await getLocationStockQuantity(
            tx,
            item.productId,
            opname.locationId
          );
          await tx.stockOpnameItem.create({
            data: {
              opnameId,
              productId: item.productId,
              systemQty,
              countedQty: item.countedQty,
              difference: item.countedQty - systemQty,
            },
          });
        }
        await tx.stockOpname.update({
          where: { id: opnameId },
          data: { note: note ?? opname.note },
        });
      }, TRANSACTION_OPTIONS);

      return NextResponse.json(await serializeOpname(opnameId));
    }

    if (action === "submit") {
      if (!canUpdate && !(isCreator && canCreate)) {
        return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
      }
      if (opname.status !== OPNAME_STATUS.DRAFT) {
        return NextResponse.json(
          { error: "Hanya draft yang dapat diajukan" },
          { status: 409 }
        );
      }
      const updated = await prisma.stockOpname.updateMany({
        where: { id: opnameId, status: OPNAME_STATUS.DRAFT },
        data: {
          status: OPNAME_STATUS.PENDING,
          submittedBy: session.user.id,
        },
      });
      if (updated.count !== 1) {
        return NextResponse.json(
          { error: "Status opname sudah berubah" },
          { status: 409 }
        );
      }
      return NextResponse.json(await serializeOpname(opnameId));
    }

    if (action === "reject") {
      if (!canApprove) {
        return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
      }
      if (isCreator) {
        return NextResponse.json(
          { error: "Pembuat sesi tidak boleh memutus sesinya sendiri" },
          { status: 403 }
        );
      }
      if (opname.status !== OPNAME_STATUS.PENDING) {
        return NextResponse.json(
          { error: "Hanya opname yang menunggu approval dapat ditolak" },
          { status: 409 }
        );
      }
      const updated = await prisma.stockOpname.updateMany({
        where: { id: opnameId, status: OPNAME_STATUS.PENDING },
        data: {
          status: OPNAME_STATUS.REJECTED,
          approvedBy: session.user.id,
          approvedAt: new Date(),
          rejectionNote: note,
        },
      });
      if (updated.count !== 1) {
        return NextResponse.json(
          { error: "Status opname sudah berubah" },
          { status: 409 }
        );
      }
      return NextResponse.json(await serializeOpname(opnameId));
    }

    if (action === "approve") {
      if (!canApprove) {
        return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
      }
      if (isCreator) {
        return NextResponse.json(
          { error: "Pembuat sesi tidak boleh menyetujui sesinya sendiri" },
          { status: 403 }
        );
      }
      if (opname.status !== OPNAME_STATUS.PENDING) {
        return NextResponse.json(
          { error: "Hanya opname yang menunggu approval dapat disetujui" },
          { status: 409 }
        );
      }

      await prisma.$transaction(async (tx) => {
        const claimed = await tx.stockOpname.updateMany({
          where: { id: opnameId, status: OPNAME_STATUS.PENDING },
          data: {
            status: OPNAME_STATUS.APPROVED,
            approvedBy: session.user.id,
            approvedAt: new Date(),
            postedAt: new Date(),
          },
        });
        if (claimed.count !== 1) throw new Error("STATUS_CHANGED");

        const items = await tx.stockOpnameItem.findMany({
          where: { opnameId },
          include: { product: { select: { name: true, sku: true } } },
          orderBy: { id: "asc" },
        });
        if (items.length === 0) throw new Error("EMPTY_OPNAME");

        // Pastikan stok belum berubah sejak penghitungan agar hasil opname
        // tidak menimpa penjualan/penerimaan yang terjadi setelahnya.
        for (const item of items) {
          const current = await getLocationStockQuantity(
            tx,
            item.productId,
            opname.locationId
          );
          if (current !== item.systemQty) {
            throw new Error(
              `STOCK_CHANGED:${item.product.sku || item.product.name}`
            );
          }
        }

        const adjustment = await tx.stockAdjustment.create({
          data: {
            no: `ADJ-${opname.no}`,
            date: new Date(),
            locationId: opname.locationId,
            opnameId,
            note: `Stock Opname ${opname.no}${opname.note ? ` — ${opname.note}` : ""}`,
          },
        });

        const accountingLines: Array<{ productId: number; difference: number }> = [];

        for (const item of items) {
          await setStockAtLocation(tx, {
            productId: item.productId,
            locationId: opname.locationId,
            quantity: item.countedQty,
          });
          await tx.stockAdjustmentItem.create({
            data: {
              adjustmentId: adjustment.id,
              productId: item.productId,
              oldQuantity: item.systemQty,
              newQuantity: item.countedQty,
              difference: item.difference,
            },
          });
          accountingLines.push({
            productId: item.productId,
            difference: item.difference,
          });
        }

        await processStockAdjustmentAccounting(
          adjustment.id,
          adjustment.no,
          adjustment.date,
          opname.locationId,
          accountingLines,
          tx
        );
      }, TRANSACTION_OPTIONS);

      return NextResponse.json(await serializeOpname(opnameId));
    }

    return NextResponse.json({ error: "Aksi tidak dikenal" }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "STATUS_CHANGED") {
      return NextResponse.json(
        { error: "Status opname sudah berubah" },
        { status: 409 }
      );
    }
    if (message === "EMPTY_OPNAME") {
      return NextResponse.json(
        { error: "Opname tidak memiliki item" },
        { status: 400 }
      );
    }
    if (message.startsWith("STOCK_CHANGED:")) {
      const sku = message.split(":")[1] || "produk";
      return NextResponse.json(
        {
          error: `Stok ${sku} berubah sejak penghitungan. Buat sesi opname baru agar tidak menimpa transaksi terbaru.`,
        },
        { status: 409 }
      );
    }
    if (error instanceof InvalidStockError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Gagal memproses opname:", error);
    return NextResponse.json(
      { error: "Gagal memproses opname" },
      { status: 500 }
    );
  }
}
