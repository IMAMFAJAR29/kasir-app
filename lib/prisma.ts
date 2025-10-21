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

export default prisma;
