import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";

type DbClient = Prisma.TransactionClient | typeof prisma;

/** Peta id pengguna → nama untuk kolom createdBy/submittedBy/approvedBy. */
export async function getUserNameMap(
  db: DbClient,
  ids: Array<string | null | undefined>
): Promise<Map<string, string>> {
  const unique = Array.from(
    new Set(ids.filter((id): id is string => typeof id === "string" && id.length > 0))
  );
  if (unique.length === 0) return new Map();

  const users = await db.user.findMany({
    where: { id: { in: unique } },
    select: { id: true, name: true },
  });
  return new Map(users.map((user) => [user.id, user.name]));
}

export const OPNAME_STATUS = {
  DRAFT: "DRAFT",
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
} as const;
