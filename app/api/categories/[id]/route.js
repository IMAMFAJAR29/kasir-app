import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// ✅ DELETE produk by ID
export async function DELETE(_, { params }) {
  try {
    await prisma.product.delete({
      where: { id: params.id },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
