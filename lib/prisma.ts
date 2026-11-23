import { PrismaClient } from "@prisma/client";

// Tambahkan properti prisma ke globalThis (biar TypeScript paham)
const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

// Buat instance tunggal Prisma
const prisma = globalForPrisma.prisma ?? new PrismaClient();

// Simpan instance ke globalThis hanya di development (biar gak dobel)
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

/*
 * Default Prisma adalah timeout 5 detik. Transaksi POS memakai puluhan round
 * trip berurutan; dengan latensi lintas region itu melewati 5 detik dan Prisma
 * melempar P2028 "Transaction not found".
 */
export const TRANSACTION_OPTIONS = {
  maxWait: 10_000,
  timeout: 20_000,
} as const;

export default prisma;
