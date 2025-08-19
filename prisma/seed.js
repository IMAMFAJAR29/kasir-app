import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const categories = [
    { name: "Makanan", slug: "makanan" },
    { name: "Minuman", slug: "minuman" },
    { name: "Snack", slug: "snack" },
    { name: "Alat Tulis", slug: "alat-tulis" },
    { name: "Lainnya", slug: "lainnya" },
  ];

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: cat,
    });
  }

  console.log("✅ Categories seeded!");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
  });
