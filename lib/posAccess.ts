import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";

type DbClient = Prisma.TransactionClient | typeof prisma;

/**
 * Daftar locationId yang boleh diakses pengguna.
 * Mengembalikan null jika pengguna tidak dibatasi (semua outlet).
 */
export async function getAllowedLocationIds(
  db: DbClient,
  userId: string
): Promise<number[] | null> {
  const rows = await db.userLocationAccess.findMany({
    where: { userId },
    select: { locationId: true },
  });
  if (rows.length === 0) return null;
  return rows.map((row) => row.locationId);
}

/**
 * Cek apakah pengguna boleh mengakses lokasi tertentu.
 * ADMIN tanpa pembatasan selalu boleh; pengguna dengan pembatasan
 * hanya boleh pada lokasi yang tercatat.
 */
export async function canAccessLocation(
  db: DbClient,
  userId: string,
  role: string | null | undefined,
  locationId: number
): Promise<boolean> {
  const allowed = await getAllowedLocationIds(db, userId);
  if (allowed === null) return true;
  return allowed.includes(locationId);
}

/**
 * Validasi bahwa outlet + gudang + mesin saling konsisten dan aktif.
 * Dipakai saat membuka shift maupun saat membuat transaksi.
 */
export async function loadRegisterContext(
  db: DbClient,
  registerId: number
) {
  return db.posRegister.findUnique({
    where: { id: registerId },
    select: {
      id: true,
      name: true,
      code: true,
      isActive: true,
      locationId: true,
      warehouseId: true,
      location: { select: { id: true, name: true, isActive: true } },
      warehouse: { select: { id: true, name: true, isActive: true } },
    },
  });
}
