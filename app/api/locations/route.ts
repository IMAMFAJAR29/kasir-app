import prisma from "@/lib/prisma";

// GET → Ambil semua lokasi
export async function GET() {
  try {
    const locations = await prisma.location.findMany({
      orderBy: { id: "desc" },
    });
    return new Response(JSON.stringify(locations), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(err);
    return new Response("Gagal mengambil lokasi", { status: 500 });
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
