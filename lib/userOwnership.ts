import prisma from "@/lib/prisma";

export async function getMasterOwnerId() {
  const owner = await prisma.user.findFirst({
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: { id: true },
  });
  return owner?.id ?? null;
}

/**
 * Akun master (pemilik utama) = user pertama yang pernah didaftarkan.
 * Hanya akun ini yang boleh login memakai Google.
 */
export async function getMasterOwner() {
  return prisma.user.findFirst({
    where: { deletedEmailHash: null },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: { id: true, name: true, email: true, role: true, isActive: true },
  });
}
