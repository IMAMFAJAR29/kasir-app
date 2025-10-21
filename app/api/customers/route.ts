import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET semua pelanggan
export async function GET() {
  try {
    const customers = await prisma.customer.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(customers);
  } catch (err) {
    console.error("Error get customers:", err);
    return NextResponse.json(
      { error: "Gagal mengambil daftar pelanggan" },
      { status: 500 }
    );
  }
}

// POST tambah pelanggan baru
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, phone, address } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Nama pelanggan wajib diisi" },
        { status: 400 }
      );
    }

    const customer = await prisma.customer.create({
      data: { name, email, phone, address },
    });

    return NextResponse.json(customer, { status: 201 });
  } catch (err) {
    console.error("Error create customer:", err);
    return NextResponse.json(
      { error: "Gagal menambahkan pelanggan" },
      { status: 500 }
    );
  }
}
