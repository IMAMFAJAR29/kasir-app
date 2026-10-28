import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { hasPermission } from "@/lib/permissions";
import prisma from "@/lib/prisma";

// GET /api/accounting/reports/income-statement: Laporan Laba Rugi
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

    const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), 0, 1);
    const end = endDate ? new Date(`${endDate}T23:59:59.999Z`) : new Date();

    const accounts = await prisma.account.findMany({
      where: {
        type: { in: ["REVENUE", "EXPENSE"] },
      },
      include: {
        journalLines: {
          where: {
            journalEntry: {
              transactionDate: { gte: start, lte: end },
              status: "POSTED",
            },
          },
          select: { debit: true, credit: true },
        },
      },
      orderBy: { code: "asc" },
    });

    const revenues: any[] = [];
    const cogs: any[] = [];
    const operatingExpenses: any[] = [];

    let totalRevenue = 0;
    let totalCogs = 0;
    let totalOperatingExpense = 0;

    for (const acc of accounts) {
      let debit = 0;
      let credit = 0;
      for (const line of acc.journalLines) {
        debit += Number(line.debit || 0);
        credit += Number(line.credit || 0);
      }

      const balance =
        acc.type === "REVENUE"
          ? credit - debit // Pendapatan bertambah di kredit
          : debit - credit; // Beban bertambah di debit

      if (balance === 0) continue;

      const item = {
        code: acc.code,
        name: acc.name,
        amount: balance,
      };

      if (acc.type === "REVENUE") {
        revenues.push(item);
        totalRevenue += balance;
      } else if (acc.category === "COGS" || acc.code.startsWith("5-")) {
        cogs.push(item);
        totalCogs += balance;
      } else {
        operatingExpenses.push(item);
        totalOperatingExpense += balance;
      }
    }

    const grossProfit = totalRevenue - totalCogs;
    const netIncome = grossProfit - totalOperatingExpense;

    return NextResponse.json({
      period: {
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      },
      revenues,
      totalRevenue,
      cogs,
      totalCogs,
      grossProfit,
      operatingExpenses,
      totalOperatingExpense,
      netIncome,
    });
  } catch (error) {
    console.error("Gagal membuat laporan laba rugi:", error);
    return NextResponse.json(
      { error: "Gagal membuat Laporan Laba Rugi" },
      { status: 500 }
    );
  }
}

