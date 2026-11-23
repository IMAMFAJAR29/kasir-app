/**
 * Cek konsistensi stok (read-only).
 *
 * Aturan: Product.stock harus sama dengan SUM(ProductStock.quantity).
 * Jalankan: npm run db:check-stock
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const products = await prisma.product.findMany({
    select: {
      id: true,
      sku: true,
      name: true,
      stock: true,
      stocks: { select: { locationId: true, quantity: true } },
      bom: { select: { id: true } },
    },
    orderBy: { id: "asc" },
  });

  const mismatches = products.filter((product) => {
    // Produk bundle tidak boleh punya stok maupun baris stok sendiri.
    if (product.bom) {
      return product.stock !== 0 || product.stocks.length > 0;
    }
    const total = product.stocks.reduce((sum, row) => sum + row.quantity, 0);
    return total !== product.stock;
  });

  console.log(`Produk diperiksa: ${products.length}`);

  if (mismatches.length === 0) {
    console.log("OK: Product.stock dan ProductStock konsisten.");
    return;
  }

  console.log(`DITEMUKAN ${mismatches.length} produk tidak sinkron:\n`);
  for (const product of mismatches) {
    if (product.bom) {
      console.log(
        `- #${product.id} ${product.sku} "${product.name}": BUNDLE harus stok 0, ditemukan Product.stock=${product.stock}, baris lokasi=${product.stocks.length}`
      );
      continue;
    }
    const total = product.stocks.reduce((sum, row) => sum + row.quantity, 0);
    console.log(
      `- #${product.id} ${product.sku} "${product.name}": Product.stock=${product.stock}, total lokasi=${total}`
    );
  }
  process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
