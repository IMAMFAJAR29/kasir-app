import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { ensureDefaultAccountsExist } from "./defaultAccounts";

export interface JournalLineInput {
  accountCode: string;
  debit: number | Prisma.Decimal;
  credit: number | Prisma.Decimal;
  description?: string;
  locationId?: number;
}

export interface CreateJournalEntryParams {
  transactionDate?: Date;
  sourceType: "SALE" | "INVOICE" | "RECEIPT" | "ADJUSTMENT" | "PAYMENT" | "MANUAL";
  sourceId?: string;
  description: string;
  lines: JournalLineInput[];
}

type DbClient = Prisma.TransactionClient | typeof prisma;

// Cache ID akun berdasarkan kode untuk performa
const accountCache = new Map<string, string>();

export async function getAccountIdByCode(code: string, tx: DbClient = prisma): Promise<string> {
  if (accountCache.has(code)) {
    return accountCache.get(code)!;
  }

  let account = await tx.account.findUnique({
    where: { code },
    select: { id: true },
  });

  if (!account) {
    // Inisialisasi default accounts jika belum ada
    await ensureDefaultAccountsExist();
    account = await tx.account.findUnique({
      where: { code },
      select: { id: true },
    });
  }

  if (!account) {
    throw new Error(`Akun akuntansi dengan kode "${code}" tidak ditemukan dalam Chart of Accounts.`);
  }

  accountCache.set(code, account.id);
  return account.id;
}

export async function generateEntryNumber(tx: DbClient = prisma): Promise<string> {
  const now = new Date();
  const yyyymmdd = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const prefix = `JV-${yyyymmdd}-`;

  const lastEntry = await tx.journalEntry.findFirst({
    where: { entryNumber: { startsWith: prefix } },
    orderBy: { entryNumber: "desc" },
    select: { entryNumber: true },
  });

  let nextSequence = 1;
  if (lastEntry?.entryNumber) {
    const parts = lastEntry.entryNumber.split("-");
    const lastSeq = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(lastSeq)) {
      nextSequence = lastSeq + 1;
    }
  }

  return `${prefix}${String(nextSequence).padStart(4, "0")}`;
}

export async function postJournalEntry(
  params: CreateJournalEntryParams,
  tx: DbClient = prisma
) {
  const { sourceType, sourceId, description, lines, transactionDate = new Date() } = params;

  if (!lines || lines.length === 0) {
    throw new Error("Jurnal harus memiliki minimal satu baris debit dan kredit.");
  }

  // 1. Cek idempotensi: jika sudah pernah diposting untuk dokumen ini, kembalikan entri yang ada
  if (sourceId) {
    const existing = await tx.journalEntry.findFirst({
      where: {
        sourceType,
        sourceId: String(sourceId),
        isReversal: false,
      },
      include: {
        lines: {
          include: { account: true },
        },
      },
    });

    if (existing) {
      return existing;
    }
  }

  // 2. Validasi keseimbangan debit dan kredit
  let totalDebit = 0;
  let totalCredit = 0;

  for (const line of lines) {
    const debit = Number(line.debit || 0);
    const credit = Number(line.credit || 0);

    if (debit < 0 || credit < 0) {
      throw new Error("Nominal debit dan kredit tidak boleh bernilai negatif.");
    }
    if (debit > 0 && credit > 0) {
      throw new Error("Satu baris jurnal tidak boleh memiliki nilai debit dan kredit sekaligus.");
    }

    totalDebit += debit;
    totalCredit += credit;
  }

  // Toleransi rounding 2 desimal (0.01)
  const diff = Math.abs(totalDebit - totalCredit);
  if (diff > 0.01) {
    throw new Error(
      `Jurnal tidak seimbang! Total Debit (Rp ${totalDebit.toLocaleString("id-ID")}) != Total Kredit (Rp ${totalCredit.toLocaleString("id-ID")}). Selisih: Rp ${diff.toLocaleString("id-ID")}`
    );
  }

  // 3. Resolusi ID akun
  const resolvedLines = [];
  for (const line of lines) {
    const accountId = await getAccountIdByCode(line.accountCode, tx);
    resolvedLines.push({
      accountId,
      debit: new Prisma.Decimal(line.debit || 0),
      credit: new Prisma.Decimal(line.credit || 0),
      description: line.description || description,
      locationId: line.locationId || null,
    });
  }

  // 4. Generate nomor jurnal
  const entryNumber = await generateEntryNumber(tx);

  // 5. Simpan Header dan Detail Jurnal
  const journalEntry = await tx.journalEntry.create({
    data: {
      entryNumber,
      transactionDate,
      sourceType,
      sourceId: sourceId ? String(sourceId) : null,
      description,
      status: "POSTED",
      lines: {
        create: resolvedLines,
      },
    },
    include: {
      lines: {
        include: { account: true },
      },
    },
  });

  return journalEntry;
}

export async function reverseJournalEntry(
  journalEntryId: string,
  reason: string,
  tx: DbClient = prisma
) {
  const original = await tx.journalEntry.findUnique({
    where: { id: journalEntryId },
    include: { lines: { include: { account: true } } },
  });

  if (!original) {
    throw new Error("Jurnal asli yang akan dibalik tidak ditemukan.");
  }

  if (original.status === "VOIDED") {
    throw new Error("Jurnal ini sudah pernah dibatalkan/dibalik.");
  }

  const entryNumber = await generateEntryNumber(tx);

  // Buat jurnal pembalik: tukar posisi Debit dan Kredit
  const reversedLines = original.lines.map((line) => ({
    accountId: line.accountId,
    debit: line.credit, // Debit mengambil nilai Kredit asli
    credit: line.debit, // Kredit mengambil nilai Debit asli
    description: `Pembalik: ${line.description || original.description}`,
    locationId: line.locationId,
  }));

  const reversalEntry = await tx.journalEntry.create({
    data: {
      entryNumber,
      transactionDate: new Date(),
      sourceType: original.sourceType,
      sourceId: original.sourceId,
      description: `[REVERSAL] ${original.entryNumber}: ${reason}`,
      status: "POSTED",
      isReversal: true,
      reversalOfId: original.id,
      lines: {
        create: reversedLines,
      },
    },
    include: {
      lines: { include: { account: true } },
    },
  });

  // Update status jurnal asli menjadi VOIDED
  await tx.journalEntry.update({
    where: { id: original.id },
    data: { status: "VOIDED" },
  });

  return reversalEntry;
}

