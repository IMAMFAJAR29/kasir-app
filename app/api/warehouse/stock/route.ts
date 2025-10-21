import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

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

    // Ambil semua produk
    const products = await prisma.product.findMany({
      orderBy: { name: "asc" },
    });

    // Ambil stok per lokasi
    const stocks: ProductStock[] = await prisma.productStock.findMany({
      where: { locationId },
    });

    // Gabungkan stok ke produk
    const result = products.map((prod) => {
      const stockRecord = stocks.find(
        (s: ProductStock) => s.productId === prod.id
      );
      return {
        id: prod.id,
        productId: prod.id,
        name: prod.name,
        sku: prod.sku,
        imageUrl: prod.imageUrl || "",
        stock: stockRecord?.quantity || 0,
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
