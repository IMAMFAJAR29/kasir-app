import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { hasPermission } from "@/lib/permissions";
import prisma from "@/lib/prisma";

// GET /api/accounting/reports/balance-sheet: Laporan Neraca
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
    const asOfDate = searchParams.get("asOfDate");
    const cutoff = asOfDate ? new Date(`${asOfDate}T23:59:59.999Z`) : new Date();

    const accounts = await prisma.account.findMany({
      include: {
        journalLines: {
          where: {
            journalEntry: {
              transactionDate: { lte: cutoff },
              status: "POSTED",
            },
          },
          select: { debit: true, credit: true },
        },
      },
      orderBy: { code: "asc" },
    });

    const assets: any[] = [];
    const liabilities: any[] = [];
    const equity: any[] = [];

    let totalAssets = 0;
    let totalLiabilities = 0;
    let totalEquity = 0;

    // Untuk akumulasi laba bersih berjalan (Revenue - Expense)
    let totalRevenue = 0;
    let totalExpense = 0;

    for (const acc of accounts) {
      let debit = 0;
      let credit = 0;
      for (const line of acc.journalLines) {
        debit += Number(line.debit || 0);
        credit += Number(line.credit || 0);
      }

      if (acc.type === "ASSET") {
        const balance = debit - credit;
        if (balance !== 0) {
          assets.push({ code: acc.code, name: acc.name, amount: balance });
          totalAssets += balance;
        }
      } else if (acc.type === "LIABILITY") {
        const balance = credit - debit;
        if (balance !== 0) {
          liabilities.push({ code: acc.code, name: acc.name, amount: balance });
          totalLiabilities += balance;
        }
      } else if (acc.type === "EQUITY") {
        const balance = credit - debit;
        if (balance !== 0) {
          equity.push({ code: acc.code, name: acc.name, amount: balance });
          totalEquity += balance;
        }
      } else if (acc.type === "REVENUE") {
        totalRevenue += credit - debit;
      } else if (acc.type === "EXPENSE") {
        totalExpense += debit - credit;
      }
    }

    // Laba periode berjalan dimasukkan ke bagian Ekuitas
    const currentPeriodNetIncome = totalRevenue - totalExpense;
    if (currentPeriodNetIncome !== 0) {
      equity.push({
        code: "3-9999",
        name: "Laba Periode Berjalan (Net Income YTD)",
        amount: currentPeriodNetIncome,
      });
      totalEquity += currentPeriodNetIncome;
    }

    const totalLiabilitiesAndEquity = totalLiabilities + totalEquity;
    const isBalanced = Math.abs(totalAssets - totalLiabilitiesAndEquity) < 0.01;

    return NextResponse.json({
      asOfDate: cutoff.toISOString(),
      assets,
      totalAssets,
      liabilities,
      totalLiabilities,
      equity,
      totalEquity,
      totalLiabilitiesAndEquity,
      isBalanced,
      difference: Math.abs(totalAssets - totalLiabilitiesAndEquity),
    });
  } catch (error) {
    console.error("Gagal membuat neraca:", error);
    return NextResponse.json(
      { error: "Gagal membuat Laporan Neraca" },
      { status: 500 }
    );
  }
}

