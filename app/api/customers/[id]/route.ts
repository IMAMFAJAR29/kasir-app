import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { hasPermission } from "@/lib/permissions";
import prisma from "@/lib/prisma";
import { mapPrismaError } from "@/lib/prismaErrors";

type RouteContext = { params: Promise<{ id: string }> };

async function parseCustomerId(context: RouteContext): Promise<number | null> {
  const { id } = await context.params;
  const parsed = Number(id);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

// GET detail pelanggan
export async function GET(req: Request, context: RouteContext) {
  const auth = await getServerSession(authOptions);
  if (!auth?.user?.id) {
    return NextResponse.json({ error: "Autentikasi diperlukan" }, { status: 401 });
  }
  if (!hasPermission(auth.user.role, auth.user.permissions, "customers", "view")) {
    return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
  }

  const id = await parseCustomerId(context);
  if (!id) {
    return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
  }

  try {
    const customer = await prisma.customer.findUnique({ where: { id } });

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
export async function PUT(req: Request, context: RouteContext) {
  const auth = await getServerSession(authOptions);
  if (!auth?.user?.id) {
    return NextResponse.json({ error: "Autentikasi diperlukan" }, { status: 401 });
  }
  if (!hasPermission(auth.user.role, auth.user.permissions, "customers", "update")) {
    return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
  }

  const id = await parseCustomerId(context);
  if (!id) {
    return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
  }

  try {
    const body = await req.json();
    const { name, email, phone, address } = body;

    if (name !== undefined && String(name).trim() === "") {
      return NextResponse.json(
        { error: "Nama pelanggan tidak boleh kosong" },
        { status: 400 }
      );
    }

    const customer = await prisma.customer.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name: String(name).trim() } : {}),
        ...(email !== undefined ? { email: email || null } : {}),
        ...(phone !== undefined ? { phone: phone || null } : {}),
        ...(address !== undefined ? { address: address || null } : {}),
      },
    });

    return NextResponse.json(customer);
  } catch (err) {
    const mapped = mapPrismaError(err);
    if (mapped) {
      return NextResponse.json(
        {
          error:
            mapped.status === 404
              ? "Pelanggan tidak ditemukan"
              : mapped.message,
        },
        { status: mapped.status }
      );
    }

    console.error("Error update customer:", err);
    return NextResponse.json(
      { error: "Gagal memperbarui data pelanggan" },
      { status: 500 }
    );
  }
}

// DELETE hapus pelanggan
export async function DELETE(req: Request, context: RouteContext) {
  const auth = await getServerSession(authOptions);
  if (!auth?.user?.id) {
    return NextResponse.json({ error: "Autentikasi diperlukan" }, { status: 401 });
  }
  if (!hasPermission(auth.user.role, auth.user.permissions, "customers", "delete")) {
    return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
  }

  const id = await parseCustomerId(context);
  if (!id) {
    return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
  }

  try {
    await prisma.customer.delete({ where: { id } });

    return NextResponse.json({ message: "Pelanggan berhasil dihapus" });
  } catch (err) {
    const mapped = mapPrismaError(err);
    if (mapped) {
      return NextResponse.json(
        {
          error:
            mapped.status === 404
              ? "Pelanggan tidak ditemukan"
              : "Pelanggan tidak dapat dihapus karena masih digunakan",
        },
        { status: mapped.status }
      );
    }

    console.error("Error delete customer:", err);
    return NextResponse.json(
      { error: "Gagal menghapus pelanggan" },
      { status: 500 }
    );
  }
}
