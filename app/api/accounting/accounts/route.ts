import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { hasPermission } from "@/lib/permissions";
import prisma from "@/lib/prisma";
import { ensureDefaultAccountsExist } from "@/lib/accounting/defaultAccounts";

// GET /api/accounting/accounts: Ambil semua akun COA beserta saldo terhitung
export async function GET() {
  const auth = await getServerSession(authOptions);
  if (!auth?.user?.id) {
    return NextResponse.json({ error: "Autentikasi diperlukan" }, { status: 401 });
  }
  if (!hasPermission(auth.user.role, auth.user.permissions, "accounting", "view")) {
    return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
  }
  try {
    // Pastikan akun default sudah ada
    await ensureDefaultAccountsExist();

    const accounts = await prisma.account.findMany({
      orderBy: { code: "asc" },
      include: {
        journalLines: {
          select: {
            debit: true,
            credit: true,
          },
        },
      },
    });

    const accountsWithBalance = accounts.map((acc) => {
      let totalDebit = 0;
      let totalCredit = 0;

      for (const line of acc.journalLines) {
        totalDebit += Number(line.debit || 0);
        totalCredit += Number(line.credit || 0);
      }

      // Saldo berdasarkan normal balance
      const balance =
        acc.normalBalance === "DEBIT"
          ? totalDebit - totalCredit
          : totalCredit - totalDebit;

      return {
        id: acc.id,
        code: acc.code,
        name: acc.name,
        type: acc.type,
        normalBalance: acc.normalBalance,
        category: acc.category,
        description: acc.description,
        isSystem: acc.isSystem,
        isActive: acc.isActive,
        totalDebit,
        totalCredit,
        balance,
      };
    });

    return NextResponse.json(accountsWithBalance, { status: 200 });
  } catch (error) {
    console.error("Gagal mengambil data akun COA:", error);
    return NextResponse.json(
      { error: "Gagal mengambil daftar Chart of Accounts" },
      { status: 500 }
    );
  }
}

// POST /api/accounting/accounts: Buat akun baru kustom
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
    const { code, name, type, normalBalance, category, description } = body;

    if (!code || !name || !type || !normalBalance) {
      return NextResponse.json(
        { error: "Kode, nama, tipe, dan saldo normal akun wajib diisi." },
        { status: 400 }
      );
    }

    if (!["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"].includes(type)) {
      return NextResponse.json(
        { error: "Tipe akun tidak valid (ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE)." },
        { status: 400 }
      );
    }

    if (!["DEBIT", "CREDIT"].includes(normalBalance)) {
      return NextResponse.json(
        { error: "Saldo normal harus DEBIT atau CREDIT." },
        { status: 400 }
      );
    }

    const existing = await prisma.account.findUnique({
      where: { code: code.trim() },
    });
    if (existing) {
      return NextResponse.json(
        { error: `Kode akun "${code}" sudah digunakan.` },
        { status: 409 }
      );
    }

    const newAccount = await prisma.account.create({
      data: {
        code: code.trim(),
        name: name.trim(),
        type,
        normalBalance,
        category: category || null,
        description: description || null,
        isSystem: false,
        isActive: true,
      },
    });

    return NextResponse.json(newAccount, { status: 201 });
  } catch (error) {
    console.error("Gagal membuat akun akuntansi:", error);
    return NextResponse.json(
      { error: "Gagal membuat akun Chart of Accounts" },
      { status: 500 }
    );
  }
}

