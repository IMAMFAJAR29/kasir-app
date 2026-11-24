import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/authOptions";
import { getAllowedLocationIds } from "@/lib/posAccess";

// GET → Ambil semua lokasi (dibatasi untuk kasir yang punya akses outlet terbatas)
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const allowed = session?.user?.id
      ? await getAllowedLocationIds(prisma, session.user.id)
      : null;

    const locations = await prisma.location.findMany({
      where: allowed !== null ? { id: { in: allowed } } : undefined,
      orderBy: { id: "desc" },
    });
    return NextResponse.json(locations, { status: 200 });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Gagal mengambil lokasi" },
      { status: 500 }
    );
  }
}

// POST → Tambah lokasi baru
export async function POST(req: Request) {
  try {
    const { name, address } = await req.json();

    if (!name) {
      return new Response("Nama lokasi diperlukan", { status: 400 });
    }

    const newLoc = await prisma.location.create({
      data: { name, address, isActive: true },
    });

    return new Response(JSON.stringify(newLoc), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(err);
    return new Response("Gagal membuat lokasi", { status: 500 });
  }
}
