import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET /api/accounting/reports/ledger: Buku Besar per Akun
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const accountCode = searchParams.get("accountCode");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    if (!accountCode) {
      return NextResponse.json(
        { error: "Kode akun (accountCode) wajib dipilih." },
        { status: 400 }
      );
    }

    const account = await prisma.account.findUnique({
      where: { code: accountCode },
    });
    if (!account) {
      return NextResponse.json({ error: "Akun tidak ditemukan." }, { status: 404 });
    }

    const start = startDate ? new Date(startDate) : new Date("2020-01-01");
    const end = endDate ? new Date(`${endDate}T23:59:59.999Z`) : new Date("2099-12-31");

    // 1. Hitung Saldo Awal sebelum startDate
    const priorLines = await prisma.journalEntryLine.findMany({
      where: {
        accountId: account.id,
        journalEntry: {
          transactionDate: { lt: start },
          status: "POSTED",
        },
      },
      select: { debit: true, credit: true },
    });

    let openingDebit = 0;
    let openingCredit = 0;
    for (const line of priorLines) {
      openingDebit += Number(line.debit || 0);
      openingCredit += Number(line.credit || 0);
    }

    const openingBalance =
      account.normalBalance === "DEBIT"
        ? openingDebit - openingCredit
        : openingCredit - openingDebit;

    // 2. Ambil mutasi dalam periode [start, end]
    const currentLines = await prisma.journalEntryLine.findMany({
      where: {
        accountId: account.id,
        journalEntry: {
          transactionDate: { gte: start, lte: end },
          status: "POSTED",
        },
      },
      include: {
        journalEntry: {
          select: {
            entryNumber: true,
            transactionDate: true,
            sourceType: true,
            sourceId: true,
            description: true,
          },
        },
        location: { select: { name: true } },
      },
      orderBy: { journalEntry: { transactionDate: "asc" } },
    });

    let runningBalance = openingBalance;
    let periodDebit = 0;
    let periodCredit = 0;

    const formattedLines = currentLines.map((line) => {
      const debit = Number(line.debit || 0);
      const credit = Number(line.credit || 0);
      periodDebit += debit;
      periodCredit += credit;

      if (account.normalBalance === "DEBIT") {
        runningBalance += debit - credit;
      } else {
        runningBalance += credit - debit;
      }

      return {
        id: line.id,
        date: line.journalEntry.transactionDate,
        entryNumber: line.journalEntry.entryNumber,
        sourceType: line.journalEntry.sourceType,
        description: line.description || line.journalEntry.description,
        locationName: line.location?.name || "-",
        debit,
        credit,
        runningBalance,
      };
    });

    return NextResponse.json({
      account: {
        code: account.code,
        name: account.name,
        type: account.type,
        normalBalance: account.normalBalance,
      },
      openingBalance,
      periodDebit,
      periodCredit,
      closingBalance: runningBalance,
      lines: formattedLines,
    });
  } catch (error) {
    console.error("Gagal membuat buku besar:", error);
    return NextResponse.json(
      { error: "Gagal membuat laporan Buku Besar" },
      { status: 500 }
    );
  }
}

