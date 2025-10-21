import { PrismaClient } from "@prisma/client";
import slugify from "slugify";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding categories...");

  const categories = [
    { name: "Makanan" },
    { name: "Minuman" },
    { name: "Snack" },
    { name: "Alat Tulis" },
    { name: "Lainnya" },
  ];

  for (const cat of categories) {
    const slug = slugify(cat.name, { lower: true });
    await prisma.category.upsert({
      where: { slug },
      update: {},
      create: { ...cat, slug },
    });
  }

  console.log("✅ Categories seeded!");

  // 🌱 Tambahkan seeder pajak di bawah ini
  console.log("🌱 Seeding taxes...");

  const taxes = [
    { name: "PPN 10%", rate: 10 },
    { name: "PPN 11%", rate: 11 },
    { name: "PPN 12%", rate: 12 },
  ];

  for (const tax of taxes) {
    const existing = await prisma.tax.findFirst({
      where: { name: tax.name },
    });

    if (!existing) {
      await prisma.tax.create({ data: tax });
    }
  }

  console.log("✅ Taxes seeded!");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
