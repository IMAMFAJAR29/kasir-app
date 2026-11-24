import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/authOptions";
import { canAccessLocation } from "@/lib/posAccess";
import { getLocationStockSnapshot } from "@/lib/inventoryStock";

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
    if (!Number.isSafeInteger(locationId) || locationId <= 0) {
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

    const rows = await getLocationStockSnapshot(prisma, locationId);
    return NextResponse.json(rows);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
