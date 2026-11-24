import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { computeBundleStock } from "@/lib/bom";
import { authOptions } from "@/lib/authOptions";
import { canAccessLocation } from "@/lib/posAccess";

// Interface ProductStock
interface ProductStock {
  id: number;
  productId: number;
  locationId: number;
  quantity: number;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const locationIdParam = searchParams.get("locationId");

    if (!locationIdParam) {
      return NextResponse.json(
        { error: "locationId is required" },
        { status: 400 }
      );
    }

    const locationId = Number(locationIdParam);
    if (isNaN(locationId)) {
      return NextResponse.json(
        { error: "locationId must be a number" },
        { status: 400 }
      );
    }

    // Kasir hanya boleh membaca stok gudang yang menjadi hak outletnya.
    const session = await getServerSession(authOptions);
    if (
      session?.user?.id &&
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

    // Ambil semua produk
    const products = await prisma.product.findMany({
      orderBy: { name: "asc" },
    });

    // Ambil stok per lokasi
    const stocks: ProductStock[] = await prisma.productStock.findMany({
      where: { locationId },
    });

    // Produk yang sudah punya baris stok di lokasi mana pun. Produk di luar
    // daftar ini adalah produk legacy yang masih memakai Product.stock.
    const trackedRows = await prisma.productStock.findMany({
      distinct: ["productId"],
      select: { productId: true },
    });
    const trackedProductIds = new Set(
      trackedRows.map((row) => row.productId)
    );
    const quantityByProduct = new Map(
      stocks.map((row) => [row.productId, row.quantity])
    );

    // Komposisi bundle untuk semua produk bundle.
    const boms = await prisma.bom.findMany({
      select: {
        productId: true,
        components: { select: { componentProductId: true, quantity: true } },
      },
    });
    const bundleMap = new Map(
      boms.map((bom) => [
        bom.productId,
        bom.components.map((component) => ({
          componentProductId: component.componentProductId,
          quantity: component.quantity,
        })),
      ])
    );

    const stockOf = (productId: number, fallbackLegacyStock: number) =>
      quantityByProduct.get(productId) ??
      (trackedProductIds.has(productId) ? 0 : fallbackLegacyStock);

    const legacyStockByProduct = new Map(
      products.map((prod) => [prod.id, prod.stock])
    );

    // Gabungkan stok ke produk
    const result = products.map((prod) => {
      const components = bundleMap.get(prod.id);
      const isBundle = Boolean(components);
      const availableByProductId = new Map(
        Array.from(new Set((components ?? []).map((c) => c.componentProductId))).map(
          (componentId) => [
            componentId,
            stockOf(componentId, legacyStockByProduct.get(componentId) ?? 0),
          ]
        )
      );

      return {
        id: prod.id,
        productId: prod.id,
        name: prod.name,
        sku: prod.sku,
        imageUrl: prod.imageUrl || "",
        isBundle,
        stock: isBundle
          ? computeBundleStock(components ?? [], availableByProductId)
          : stockOf(prod.id, prod.stock),
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
