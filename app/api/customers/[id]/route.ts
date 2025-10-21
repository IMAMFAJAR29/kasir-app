import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET detail pelanggan
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const customer = await prisma.customer.findUnique({
      where: { id: Number(params.id) },
    });

    if (!customer) {
      return NextResponse.json(
        { error: "Pelanggan tidak ditemukan" },
        { status: 404 }
      );
    }

    return NextResponse.json(customer);
  } catch (err) {
    console.error("Error get customer:", err);
    return NextResponse.json(
      { error: "Gagal mengambil data pelanggan" },
      { status: 500 }
    );
  }
}

// PUT update pelanggan
export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const { name, email, phone, address } = body;

    const customer = await prisma.customer.update({
      where: { id: Number(params.id) },
      data: { name, email, phone, address },
    });

    return NextResponse.json(customer);
  } catch (err) {
    console.error("Error update customer:", err);
    return NextResponse.json(
      { error: "Gagal memperbarui data pelanggan" },
      { status: 500 }
    );
  }
}

// DELETE hapus pelanggan
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.customer.delete({
      where: { id: Number(params.id) },
    });

    return NextResponse.json({ message: "Pelanggan berhasil dihapus" });
  } catch (err) {
    console.error("Error delete customer:", err);
    return NextResponse.json(
      { error: "Gagal menghapus pelanggan" },
      { status: 500 }
    );
  }
}
