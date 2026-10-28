import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { hasPermission } from "@/lib/permissions";
import prisma from "@/lib/prisma";
import { postJournalEntry } from "@/lib/accounting/postingService";

// GET /api/accounting/journals: Ambil riwayat jurnal umum
export async function GET(req: Request) {
  const auth = await getServerSession(authOptions);
  if (!auth?.user?.id) {
    return NextResponse.json({ error: "Autentikasi diperlukan" }, { status: 401 });
  }
  if (!hasPermission(auth.user.role, auth.user.permissions, "accounting", "view")) {
    return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
  }
  try {
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const sourceType = searchParams.get("sourceType");
    const search = searchParams.get("search");

    const where: any = {};

    if (startDate && endDate) {
      where.transactionDate = {
        gte: new Date(startDate),
        lte: new Date(`${endDate}T23:59:59.999Z`),
      };
    } else if (startDate) {
      where.transactionDate = { gte: new Date(startDate) };
    } else if (endDate) {
      where.transactionDate = { lte: new Date(`${endDate}T23:59:59.999Z`) };
    }

    if (sourceType) {
      where.sourceType = sourceType;
    }

    if (search) {
      where.OR = [
        { entryNumber: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    const entries = await prisma.journalEntry.findMany({
      where,
      include: {
        lines: {
          include: {
            account: { select: { code: true, name: true, type: true } },
            location: { select: { id: true, name: true } },
          },
          orderBy: { debit: "desc" }, // Baris debit tampil di atas
        },
      },
      orderBy: { transactionDate: "desc" },
      take: 200,
    });

    return NextResponse.json(entries, { status: 200 });
  } catch (error) {
    console.error("Gagal mengambil riwayat jurnal:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data Jurnal Umum" },
      { status: 500 }
    );
  }
}

// POST /api/accounting/journals: Buat jurnal manual / penyesuaian
export async function POST(req: Request) {
  const auth = await getServerSession(authOptions);
  if (!auth?.user?.id) {
    return NextResponse.json({ error: "Autentikasi diperlukan" }, { status: 401 });
  }
  if (!hasPermission(auth.user.role, auth.user.permissions, "accounting", "create")) {
    return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
  }
  try {
    const body = await req.json();
    const { description, transactionDate, lines } = body;

    if (!description || !lines || lines.length === 0) {
      return NextResponse.json(
        { error: "Keterangan dan baris jurnal wajib diisi." },
        { status: 400 }
      );
    }

    const journal = await postJournalEntry({
      sourceType: "MANUAL",
      description,
      transactionDate: transactionDate ? new Date(transactionDate) : new Date(),
      lines,
    });

    return NextResponse.json(journal, { status: 201 });
  } catch (error: any) {
    console.error("Gagal membuat jurnal manual:", error);
    return NextResponse.json(
      { error: error?.message || "Gagal membuat entri jurnal" },
      { status: 400 }
    );
  }
}

