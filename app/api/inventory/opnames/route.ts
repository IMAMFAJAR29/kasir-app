import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma, { TRANSACTION_OPTIONS } from "@/lib/prisma";
import { authOptions } from "@/lib/authOptions";
import { hasPermission } from "@/lib/permissions";
import { canAccessLocation } from "@/lib/posAccess";
import { getLocationStockQuantity, InvalidStockError } from "@/lib/productStock";
import { getUserNameMap, OPNAME_STATUS } from "@/lib/inventoryOpname";

interface CountedItem {
  productId: number;
  countedQty: number;
}

function mergeCounted(items: CountedItem[]): CountedItem[] {
  const byId = new Map<number, number>();
  for (const item of items) byId.set(item.productId, item.countedQty);
  return Array.from(byId.entries()).map(([productId, countedQty]) => ({
    productId,
    countedQty,
  }));
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (
    !session?.user?.id ||
    !hasPermission(
      session.user.role,
      session.user.permissions,
      "inventoryOpname",
      "view"
    )
  ) {
    return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const locationParam = searchParams.get("locationId");
  const status = searchParams.get("status");
  const search = (searchParams.get("q") || "").trim();

  const locationId = locationParam ? Number(locationParam) : null;
  if (locationParam && (!Number.isSafeInteger(locationId) || (locationId ?? 0) <= 0)) {
    return NextResponse.json({ error: "locationId tidak valid" }, { status: 400 });
  }

  const opnames = await prisma.stockOpname.findMany({
    where: {
      ...(locationId !== null ? { locationId } : {}),
      ...(status ? { status } : {}),
      ...(search
        ? {
            OR: [
              { no: { contains: search, mode: "insensitive" } },
              { note: { contains: search, mode: "insensitive" } },
              {
                items: {
                  some: {
                    product: {
                      OR: [
                        { name: { contains: search, mode: "insensitive" } },
                        { sku: { contains: search, mode: "insensitive" } },
                      ],
                    },
                  },
                },
              },
            ],
          }
        : {}),
    },
    include: {
      location: { select: { id: true, name: true } },
      items: {
        orderBy: { id: "asc" },
        select: {
          id: true,
          productId: true,
          systemQty: true,
          countedQty: true,
          difference: true,
          product: { select: { name: true, sku: true } },
        },
      },
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 100,
  });

  const names = await getUserNameMap(
    prisma,
    opnames.flatMap((opname) => [
      opname.createdBy,
      opname.submittedBy,
      opname.approvedBy,
    ])
  );

  return NextResponse.json(
    opnames.map((opname) => {
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
    })
  );
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (
    !session?.user?.id ||
    !hasPermission(
      session.user.role,
      session.user.permissions,
      "inventoryOpname",
      "create"
    )
  ) {
    return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Data permintaan tidak valid" }, { status: 400 });
  }
  const source = (body ?? {}) as Record<string, unknown>;
  const locationId = Number(source.locationId);
  if (!Number.isSafeInteger(locationId) || locationId <= 0) {
    return NextResponse.json({ error: "Gudang tidak valid" }, { status: 400 });
  }
  if (
    !(await canAccessLocation(
      prisma,
      session.user.id,
      session.user.role,
      locationId
    ))
  ) {
    return NextResponse.json(
      { error: "Anda tidak memiliki akses ke gudang ini" },
      { status: 403 }
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
  const items = mergeCounted(counted);
  const note = typeof source.note === "string" ? source.note.trim() || null : null;
  const opnameNo =
    typeof source.no === "string" && source.no.trim()
      ? source.no.trim()
      : `OPN-${Date.now()}`;

  try {
    const opname = await prisma.$transaction(async (tx) => {
      const bundleRows = await tx.bom.findMany({
        where: { productId: { in: items.map((item) => item.productId) } },
        select: { product: { select: { name: true } } },
      });
      if (bundleRows.length > 0) {
        throw new InvalidStockError(
          `Produk bundle tidak bisa diopname langsung (${bundleRows
            .map((row) => row.product.name)
            .join(", ")}). Hitung komponennya.`
        );
      }

      const created = await tx.stockOpname.create({
        data: {
          no: opnameNo,
          locationId,
          status: OPNAME_STATUS.DRAFT,
          note,
          createdBy: session.user.id,
        },
      });

      for (const item of items) {
        const systemQty = await getLocationStockQuantity(
          tx,
          item.productId,
          locationId
        );
        await tx.stockOpnameItem.create({
          data: {
            opnameId: created.id,
            productId: item.productId,
            systemQty,
            countedQty: item.countedQty,
            difference: item.countedQty - systemQty,
          },
        });
      }

      return created;
    }, TRANSACTION_OPTIONS);

    return NextResponse.json(opname, { status: 201 });
  } catch (error) {
    if (error instanceof InvalidStockError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "Nomor opname sudah digunakan" },
        { status: 409 }
      );
    }
    console.error("Gagal membuat opname:", error);
    return NextResponse.json({ error: "Gagal membuat opname" }, { status: 500 });
  }
}
