import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { hasPermission } from "@/lib/permissions";
import prisma from "@/lib/prisma";

// GET /api/accounting/reports/trial-balance: Neraca Saldo
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
      where: { isActive: true },
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

    let totalDebitSum = 0;
    let totalCreditSum = 0;

    const rows = accounts
      .map((acc) => {
        let debitTotal = 0;
        let creditTotal = 0;

        for (const line of acc.journalLines) {
          debitTotal += Number(line.debit || 0);
          creditTotal += Number(line.credit || 0);
        }

        const net = debitTotal - creditTotal;
        let finalDebit = 0;
        let finalCredit = 0;

        if (acc.normalBalance === "DEBIT") {
          if (net >= 0) {
            finalDebit = net;
          } else {
            finalCredit = Math.abs(net);
          }
        } else {
          // Normal balance CREDIT
          if (net <= 0) {
            finalCredit = Math.abs(net);
          } else {
            finalDebit = net;
          }
        }

        totalDebitSum += finalDebit;
        totalCreditSum += finalCredit;

        return {
          code: acc.code,
          name: acc.name,
          type: acc.type,
          normalBalance: acc.normalBalance,
          debit: finalDebit,
          credit: finalCredit,
        };
      })
      .filter((row) => row.debit !== 0 || row.credit !== 0);

    return NextResponse.json({
      asOfDate: cutoff.toISOString(),
      rows,
      totalDebit: totalDebitSum,
      totalCredit: totalCreditSum,
      isBalanced: Math.abs(totalDebitSum - totalCreditSum) < 0.01,
      difference: Math.abs(totalDebitSum - totalCreditSum),
    });
  } catch (error) {
    console.error("Gagal membuat neraca saldo:", error);
    return NextResponse.json(
      { error: "Gagal membuat laporan Neraca Saldo" },
      { status: 500 }
    );
  }
}

