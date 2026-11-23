import prisma, { TRANSACTION_OPTIONS } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { hasPermission } from "@/lib/permissions";
import {
  parseProductCreate,
  ProductInputError,
} from "@/lib/productInput";
import { BomInputError, toProductResponse } from "@/lib/bom";
import { parseBundleFields, validateBundleComponents } from "@/lib/bomInput";
import { mapPrismaError, mapStockError } from "@/lib/prismaErrors";
import {
  applyProductStockChange,
  getDefaultLocationId,
} from "@/lib/productStock";

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

// =======================
// GET /api/products
// =======================
export async function GET() {
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

  try {
    const products = await prisma.product.findMany({
      include: bundleInclude,
      orderBy: { createdAt: "desc" },
    });

    // Stok bundle dihitung dari stok komponennya (Product.stock agregat).
    const stockByProductId = new Map(
      products.map((product) => [product.id, product.stock])
    );

    const hydrated = products.map((product) =>
      toProductResponse(product, stockByProductId)
    );

    // Harga modal hanya untuk pengguna yang boleh mengelola produk.
    const canManageProducts =
      hasPermission(auth.user.role, auth.user.permissions, "products", "update") ||
      hasPermission(auth.user.role, auth.user.permissions, "products", "create") ||
      hasPermission(auth.user.role, auth.user.permissions, "products", "delete");

    if (canManageProducts) {
      return NextResponse.json(hydrated, { status: 200 });
    }

    const publicProducts = hydrated.map(({ costPrice, ...product }) => product);
    return NextResponse.json(publicProducts, { status: 200 });
  } catch (err) {
    console.error("Error fetch products:", err);
    return NextResponse.json(
      { error: "Gagal mengambil produk" },
      { status: 500 }
    );
  }
}

// =======================
// POST /api/products
// =======================
export async function POST(req: Request) {
  const auth = await getServerSession(authOptions);
  if (!auth?.user?.id) {
    return NextResponse.json(
      { error: "Autentikasi diperlukan" },
      { status: 401 }
    );
  }
  if (!hasPermission(auth.user.role, auth.user.permissions, "products", "create")) {
    return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const input = parseProductCreate(body);
    const bundleFields = parseBundleFields(body);
    const isBundle = bundleFields.isBundle === true;

    if (isBundle && input.stock > 0) {
      return NextResponse.json(
        {
          error: "Produk bundle tidak memiliki stok sendiri; stok dihitung dari komponen",
          field: "stock",
        },
        { status: 400 }
      );
    }

    const [skuConflict, barcodeConflict] = await Promise.all([
      prisma.product.findUnique({
        where: { sku: input.sku },
        select: { id: true },
      }),
      input.barcode
        ? prisma.product.findUnique({
            where: { barcode: input.barcode },
            select: { id: true },
          })
        : Promise.resolve(null),
    ]);

    if (skuConflict) {
      return NextResponse.json(
        { error: "SKU sudah digunakan produk lain", field: "sku" },
        { status: 400 }
      );
    }
    if (barcodeConflict) {
      return NextResponse.json(
        { error: "Barcode sudah digunakan produk lain", field: "barcode" },
        { status: 400 }
      );
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

    const product = await prisma.$transaction(async (tx) => {
      const created = await tx.product.create({
        data: {
          name: input.name,
          sku: input.sku,
          barcode: input.barcode,
          description: input.description,
          imageUrl: input.imageUrl,
          price: input.price,
          costPrice: input.costPrice,
          stock: 0,
          categoryId: input.categoryId,
        },
        select: { id: true },
      });

      if (isBundle) {
        const components = bundleFields.components ?? [];
        await validateBundleComponents(tx, created.id, components);
        await tx.bom.create({
          data: {
            productId: created.id,
            components: {
              create: components.map((component) => ({
                componentProductId: component.componentProductId,
                quantity: component.quantity,
              })),
            },
          },
        });
      } else {
        const locationId = await getDefaultLocationId(tx);
        await applyProductStockChange(tx, {
          productId: created.id,
          nextStock: input.stock,
          locationId,
          productName: input.name,
        });
      }

      const saved = await tx.product.findUniqueOrThrow({
        where: { id: created.id },
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

    return NextResponse.json(product, { status: 201 });
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

    console.error("Error create product:", err);
    return NextResponse.json({ error: "Gagal buat produk" }, { status: 500 });
  }
}
