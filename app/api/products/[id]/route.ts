import prisma, { TRANSACTION_OPTIONS } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { hasPermission } from "@/lib/permissions";
import {
  parseProductUpdate,
  ProductInputError,
} from "@/lib/productInput";
import { mapPrismaError, mapStockError } from "@/lib/prismaErrors";
import {
  applyProductStockChange,
  getDefaultLocationId,
} from "@/lib/productStock";
import { BomInputError, toProductResponse } from "@/lib/bom";
import { parseBundleFields, validateBundleComponents } from "@/lib/bomInput";

const bundleInclude = {
  category: true,
  bom: {
    select: {
      components: {
        select: { componentProductId: true, quantity: true },
        orderBy: { id: "asc" as const },
      },
    },
  },
} as const;

type RouteContext = { params: Promise<{ id: string }> };

/**
 * Produk satuan hanya boleh dijadikan bundle jika stok 0 dan belum pernah
 * dipakai transaksi, agar tidak ada stok/riwayat yang menggantung.
 */
async function findBundleConversionBlocker(productId: number): Promise<string | null> {
  const [product, sales, invoices, purchases, adjustments, receipts] =
    await Promise.all([
      prisma.product.findUnique({
        where: { id: productId },
        select: { stock: true },
      }),
      prisma.saleItem.count({ where: { productId } }),
      prisma.invoiceItem.count({ where: { productId } }),
      prisma.purchaseItem.count({ where: { productId } }),
      prisma.stockAdjustmentItem.count({ where: { productId } }),
      prisma.purchaseReceiptItem.count({
        where: { OR: [{ productId }, { actualProductId: productId }] },
      }),
    ]);

  if (!product) return "Produk tidak ditemukan";
  if (product.stock !== 0) {
    return "Produk hanya bisa dijadikan bundle jika stoknya 0. Kosongkan stok terlebih dahulu.";
  }

  const blockers: string[] = [];
  if (sales > 0) blockers.push(`${sales} item penjualan`);
  if (invoices > 0) blockers.push(`${invoices} item faktur`);
  if (purchases > 0) blockers.push(`${purchases} item pembelian`);
  if (adjustments > 0) blockers.push(`${adjustments} penyesuaian stok`);
  if (receipts > 0) blockers.push(`${receipts} penerimaan barang`);

  if (blockers.length > 0) {
    return `Produk belum bisa dijadikan bundle karena sudah punya riwayat ${blockers.join(", ")}.`;
  }

  return null;
}


async function parseProductId(context: RouteContext): Promise<number | null> {
  const { id } = await context.params;
  const parsed = Number(id);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

// =======================
// GET /api/products/[id]
// =======================
export async function GET(req: Request, context: RouteContext) {
  const auth = await getServerSession(authOptions);
  if (!auth?.user?.id) {
    return NextResponse.json(
      { error: "Autentikasi diperlukan" },
      { status: 401 }
    );
  }
  if (!hasPermission(auth.user.role, auth.user.permissions, "products", "view")) {
    return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
  }

  const id = await parseProductId(context);
  if (!id) {
    return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
  }

  try {
    const product = await prisma.product.findUnique({
      where: { id },
      include: bundleInclude,
    });

    if (!product) {
      return NextResponse.json(
        { error: "Produk tidak ditemukan" },
        { status: 404 }
      );
    }

    const componentIds =
      product.bom?.components.map((component) => component.componentProductId) ?? [];
    const componentStocks =
      componentIds.length > 0
        ? await prisma.product.findMany({
            where: { id: { in: componentIds } },
            select: { id: true, stock: true },
          })
        : [];

    return NextResponse.json(
      toProductResponse(
        product,
        new Map(componentStocks.map((row) => [row.id, row.stock]))
      ),
      { status: 200 }
    );
  } catch (err) {
    console.error("Error get product:", err);
    return NextResponse.json({ error: "Gagal ambil produk" }, { status: 500 });
  }
}

// =======================
// PUT /api/products/[id]
// =======================
export async function PUT(req: Request, context: RouteContext) {
  const auth = await getServerSession(authOptions);
  if (!auth?.user?.id) {
    return NextResponse.json(
      { error: "Autentikasi diperlukan" },
      { status: 401 }
    );
  }
  if (!hasPermission(auth.user.role, auth.user.permissions, "products", "update")) {
    return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
  }

  const id = await parseProductId(context);
  if (!id) {
    return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
  }

  try {
    const body = await req.json();
    const input = parseProductUpdate(body);
    const bundleFields = parseBundleFields(body);
    const existing = await prisma.product.findUnique({
      where: { id },
      include: { bom: { select: { id: true } } },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Produk tidak ditemukan" },
        { status: 404 }
      );
    }

    const existingIsBundle = Boolean(existing.bom);
    const targetIsBundle =
      bundleFields.isBundle === undefined
        ? existingIsBundle
        : bundleFields.isBundle;

    if (input.stock !== undefined && targetIsBundle) {
      return NextResponse.json(
        {
          error: "Produk bundle tidak memiliki stok sendiri; stok dihitung dari komponen",
          field: "stock",
        },
        { status: 400 }
      );
    }

    if (bundleFields.components !== undefined && !targetIsBundle) {
      return NextResponse.json(
        {
          error: "Komposisi bundle hanya boleh diisi untuk produk bundle",
          field: "components",
        },
        { status: 400 }
      );
    }

    if (!existingIsBundle && targetIsBundle) {
      const blocker = await findBundleConversionBlocker(id);
      if (blocker) {
        return NextResponse.json(
          { error: blocker, field: "isBundle" },
          { status: 400 }
        );
      }
    }

    if (input.sku && input.sku !== existing.sku) {
      const conflict = await prisma.product.findUnique({
        where: { sku: input.sku },
        select: { id: true },
      });
      if (conflict && conflict.id !== id) {
        return NextResponse.json(
          { error: "SKU sudah digunakan produk lain", field: "sku" },
          { status: 400 }
        );
      }
    }

    if (
      input.barcode !== undefined &&
      input.barcode &&
      input.barcode !== existing.barcode
    ) {
      const conflict = await prisma.product.findUnique({
        where: { barcode: input.barcode },
        select: { id: true },
      });
      if (conflict && conflict.id !== id) {
        return NextResponse.json(
          { error: "Barcode sudah digunakan produk lain", field: "barcode" },
          { status: 400 }
        );
      }
    }

    if (input.categoryId) {
      const category = await prisma.category.findUnique({
        where: { id: input.categoryId },
        select: { id: true },
      });
      if (!category) {
        return NextResponse.json(
          { error: "Kategori tidak ditemukan", field: "categoryId" },
          { status: 400 }
        );
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id },
        data: {
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.sku !== undefined ? { sku: input.sku } : {}),
          ...(input.barcode !== undefined ? { barcode: input.barcode } : {}),
          ...(input.price !== undefined ? { price: input.price } : {}),
          ...(input.costPrice !== undefined
            ? { costPrice: input.costPrice }
            : {}),
          ...(input.categoryId !== undefined
            ? { categoryId: input.categoryId }
            : {}),
          ...(input.description !== undefined
            ? { description: input.description }
            : {}),
          ...(input.imageUrl !== undefined ? { imageUrl: input.imageUrl } : {}),
          ...(targetIsBundle ? { stock: 0 } : {}),
        },
      });

      if (!targetIsBundle) {
        // Melepas status bundle: hapus komposisi, bukan produknya.
        if (existingIsBundle) {
          await tx.bom.deleteMany({ where: { productId: id } });
        }
        if (input.stock !== undefined) {
          const locationId = await getDefaultLocationId(tx);
          await applyProductStockChange(tx, {
            productId: id,
            nextStock: input.stock,
            locationId,
            productName: input.name ?? existing.name,
          });
        }
      } else if (bundleFields.components !== undefined) {
        const components = bundleFields.components;
        await validateBundleComponents(tx, id, components);
        // Bundle tidak punya stok sendiri; bersihkan baris stok lama (jika ada).
        if (!existingIsBundle) {
          await tx.productStock.deleteMany({ where: { productId: id } });
        }
        await tx.bom.deleteMany({ where: { productId: id } });
        await tx.bom.create({
          data: {
            productId: id,
            components: {
              create: components.map((component) => ({
                componentProductId: component.componentProductId,
                quantity: component.quantity,
              })),
            },
          },
        });
      }

      const saved = await tx.product.findUniqueOrThrow({
        where: { id },
        include: bundleInclude,
      });

      const componentIds =
        saved.bom?.components.map((component) => component.componentProductId) ?? [];
      const componentStocks =
        componentIds.length > 0
          ? await tx.product.findMany({
              where: { id: { in: componentIds } },
              select: { id: true, stock: true },
            })
          : [];

      return toProductResponse(
        saved,
        new Map(componentStocks.map((row) => [row.id, row.stock]))
      );
    }, TRANSACTION_OPTIONS);

    return NextResponse.json(updated, { status: 200 });
  } catch (err) {
    if (err instanceof ProductInputError) {
      return NextResponse.json(
        { error: err.message, field: err.field },
        { status: 400 }
      );
    }
    if (err instanceof BomInputError) {
      return NextResponse.json(
        { error: err.message, field: err.field },
        { status: 400 }
      );
    }
    const stockError = mapStockError(err);
    if (stockError) {
      return NextResponse.json(
        { error: stockError.message },
        { status: stockError.status }
      );
    }
    const prismaError = mapPrismaError(err);
    if (prismaError) {
      return NextResponse.json(
        { error: prismaError.message },
        { status: prismaError.status }
      );
    }

    console.error("Error update product:", err);
    return NextResponse.json({ error: "Gagal update produk" }, { status: 500 });
  }
}

// =======================
// DELETE /api/products/[id]
// =======================
export async function DELETE(req: Request, context: RouteContext) {
  const auth = await getServerSession(authOptions);
  if (!auth?.user?.id) {
    return NextResponse.json(
      { error: "Autentikasi diperlukan" },
      { status: 401 }
    );
  }
  if (!hasPermission(auth.user.role, auth.user.permissions, "products", "delete")) {
    return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
  }

  const id = await parseProductId(context);
  if (!id) {
    return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
  }

  try {
    const existing = await prisma.product.findUnique({
      where: { id },
      select: { id: true, name: true },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Produk tidak ditemukan" },
        { status: 404 }
      );
    }

    const [sales, invoices, purchases, adjustments, receipts, bundleUsage] =
      await Promise.all([
        prisma.saleItem.count({ where: { productId: id } }),
        prisma.invoiceItem.count({ where: { productId: id } }),
        prisma.purchaseItem.count({ where: { productId: id } }),
        prisma.stockAdjustmentItem.count({ where: { productId: id } }),
        prisma.purchaseReceiptItem.count({
          where: { OR: [{ productId: id }, { actualProductId: id }] },
        }),
        prisma.bomComponent.findMany({
          where: { componentProductId: id },
          select: { bom: { select: { product: { select: { sku: true } } } } },
        }),
      ]);

    const blockers: string[] = [];
    if (sales > 0) blockers.push(`${sales} item penjualan`);
    if (invoices > 0) blockers.push(`${invoices} item faktur`);
    if (purchases > 0) blockers.push(`${purchases} item pembelian`);
    if (adjustments > 0) blockers.push(`${adjustments} penyesuaian stok`);
    if (receipts > 0) blockers.push(`${receipts} penerimaan barang`);
    if (bundleUsage.length > 0) {
      const skus = bundleUsage
        .map((row) => row.bom.product.sku)
        .filter(Boolean)
        .join(", ");
      blockers.push(`komponen produk bundle ${skus}`);
    }

    if (blockers.length > 0) {
      return NextResponse.json(
        {
          error: `Produk "${existing.name}" tidak dapat dihapus karena masih digunakan pada ${blockers.join(", ")}.`,
        },
        { status: 409 }
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.productStock.deleteMany({ where: { productId: id } });
      await tx.product.delete({ where: { id } });
    }, TRANSACTION_OPTIONS);

    return NextResponse.json(
      { message: "Produk berhasil dihapus" },
      { status: 200 }
    );
  } catch (err) {
    const prismaError = mapPrismaError(err);
    if (prismaError?.status === 404) {
      return NextResponse.json(
        { error: "Produk tidak ditemukan" },
        { status: 404 }
      );
    }
    if (prismaError?.status === 400) {
      return NextResponse.json(
        { error: "Produk tidak dapat dihapus karena masih digunakan" },
        { status: 409 }
      );
    }

    console.error("Error delete product:", err);
    return NextResponse.json({ error: "Gagal hapus produk" }, { status: 500 });
  }
}
