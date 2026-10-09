import prisma from "@/lib/prisma";

export async function getMasterOwnerId() {
  const owner = await prisma.user.findFirst({
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: { id: true },
  });
  return owner?.id ?? null;
}
