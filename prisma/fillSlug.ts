import { PrismaClient } from "@prisma/client";
import slugify from "slugify";

const prisma = new PrismaClient();

async function fillSlugs() {
  console.log("🔧 Mengisi slug kosong untuk Category dan Product...");

  // CATEGORIES
  const categories = await prisma.category.findMany({ where: { slug: null } });
  for (const c of categories) {
    let baseSlug = slugify(c.name, { lower: true });
    let slug = baseSlug;
    let counter = 1;

    // cek kalau slug sudah ada di DB
    while (await prisma.category.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter++}`;
    }

    await prisma.category.update({
      where: { id: c.id },
      data: { slug },
    });
  }

  // PRODUCTS
  const products = await prisma.product.findMany({ where: { slug: null } });
  for (const p of products) {
    let baseSlug = slugify(p.name, { lower: true });
    let slug = baseSlug;
    let counter = 1;

    while (await prisma.product.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter++}`;
    }

    await prisma.product.update({
      where: { id: p.id },
      data: { slug },
    });
  }

  console.log("✅ Semua slug berhasil diisi!");
}

fillSlugs()
  .catch((err) => console.error(err))
  .finally(() => prisma.$disconnect());
