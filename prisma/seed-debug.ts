/**
 * Seed data debug yang deterministik.
 *
 * Aman dijalankan berulang kali (idempotent):
 *   - Data yang sudah ada tidak ditimpa, kecuali dijalankan dengan --reset.
 *   - Menolak berjalan ke database non-lokal (mis. Neon production).
 *
 * Cara pakai:
 *   npm run db:seed:debug                  -> buat data jika belum ada
 *   npm run db:seed:debug -- --reset       -> kembalikan stok ke nilai awal
 *
 * Untuk database remote (branch Neon khusus testing):
 *   SEED_DEBUG_ALLOW_REMOTE=1 npm run db:seed:debug
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

const DEBUG_ADMIN = {
  name: "DEBUG Admin",
  email: "debug-admin@example.com",
  password: "Debug123!",
};

const DEBUG_CASHIER = {
  name: "DEBUG Kasir",
  nik: "9999990001",
  pin: "123456",
};

const DEBUG_CATEGORY = "Minuman";

const DEBUG_PRODUCTS = [
  {
    sku: "DBG-KOPI-001",
    name: "DEBUG Kopi Susu",
    price: 15000,
    costPrice: 8000,
    stock: 20,
  },
  {
    sku: "DBG-TEH-001",
    name: "DEBUG Teh Manis",
    price: 8000,
    costPrice: 3000,
    stock: 40,
  },
];

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

function assertSafeDatabase() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL tidak ditemukan. Pastikan file .env terbaca atau jalankan dengan env yang benar."
    );
  }

  let host = "";
  try {
    host = new URL(url).hostname;
  } catch {
    throw new Error("DATABASE_URL tidak bisa diparse sebagai URL.");
  }

  if (!LOCAL_HOSTS.has(host) && process.env.SEED_DEBUG_ALLOW_REMOTE !== "1") {
    console.error("");
    console.error("DITOLAK: database tujuan bukan lokal.");
    console.error(`  Host: ${host}`);
    console.error("");
    console.error("Seed debug tidak boleh dijalankan ke database utama.");
    console.error("Opsi yang aman:");
    console.error("  1. Pakai PostgreSQL lokal / Docker (host localhost).");
    console.error("  2. Pakai branch database Neon khusus testing, lalu set DATABASE_URL-nya.");
    console.error("  3. Jika kamu benar-benar yakin, jalankan:");
    console.error("     SEED_DEBUG_ALLOW_REMOTE=1 npm run db:seed:debug");
    console.error("");
    process.exit(1);
  }

  return host;
}

async function main() {
  const host = assertSafeDatabase();
  const reset = process.argv.includes("--reset");

  console.log(`Database: ${host}${reset ? " (mode reset)" : ""}`);

  // 1. Lokasi: pakai lokasi aktif pertama supaya sama dengan lokasi default POS.
  let location = await prisma.location.findFirst({
    where: { isActive: true },
    orderBy: { id: "asc" },
  });

  if (!location) {
    location = await prisma.location.create({
      data: {
        name: "Gudang Debug",
        address: "Dibuat oleh seed-debug",
        isActive: true,
      },
    });
  }

  console.log(`Lokasi: #${location.id} ${location.name}`);

  // 2. Kategori
  const category = await prisma.category.upsert({
    where: { name: DEBUG_CATEGORY },
    update: {},
    create: { name: DEBUG_CATEGORY, slug: "minuman" },
  });

  // 3. Produk + stok per lokasi
  for (const item of DEBUG_PRODUCTS) {
    const product = await prisma.product.upsert({
      where: { sku: item.sku },
      update: reset
        ? {
            name: item.name,
            price: item.price,
            costPrice: item.costPrice,
            stock: item.stock,
            categoryId: category.id,
          }
        : {},
      create: {
        name: item.name,
        sku: item.sku,
        price: item.price,
        costPrice: item.costPrice,
        stock: item.stock,
        categoryId: category.id,
      },
    });

    const existingStock = await prisma.productStock.findUnique({
      where: {
        productId_locationId: {
          productId: product.id,
          locationId: location.id,
        },
      },
    });

    if (!existingStock) {
      await prisma.productStock.create({
        data: {
          productId: product.id,
          locationId: location.id,
          quantity: product.stock,
        },
      });
    } else if (reset) {
      await prisma.productStock.update({
        where: { id: existingStock.id },
        data: { quantity: item.stock },
      });
      await prisma.product.update({
        where: { id: product.id },
        data: { stock: item.stock },
      });
    }

    const stock = await prisma.productStock.findUnique({
      where: {
        productId_locationId: {
          productId: product.id,
          locationId: location.id,
        },
      },
      select: { quantity: true },
    });

    console.log(
      `Produk: #${product.id} ${item.sku} "${item.name}" -> stok lokasi ${stock?.quantity ?? 0}`
    );
  }

  // 4. User admin (login email + password)
  const admin = await prisma.user.upsert({
    where: { email: DEBUG_ADMIN.email },
    update: {
      name: DEBUG_ADMIN.name,
      password: await bcrypt.hash(DEBUG_ADMIN.password, 10),
      role: "ADMIN",
      isActive: true,
    },
    create: {
      name: DEBUG_ADMIN.name,
      email: DEBUG_ADMIN.email,
      password: await bcrypt.hash(DEBUG_ADMIN.password, 10),
      role: "ADMIN",
      permissions: {},
      isActive: true,
    },
  });

  // 5. User kasir (login NIK + PIN)
  const cashier = await prisma.user.upsert({
    where: { nik: DEBUG_CASHIER.nik },
    update: {
      name: DEBUG_CASHIER.name,
      pinHash: await bcrypt.hash(DEBUG_CASHIER.pin, 10),
      role: "CASHIER",
      isActive: true,
    },
    create: {
      name: DEBUG_CASHIER.name,
      nik: DEBUG_CASHIER.nik,
      pinHash: await bcrypt.hash(DEBUG_CASHIER.pin, 10),
      password: await bcrypt.hash(`debug-${Date.now()}`, 10),
      role: "CASHIER",
      permissions: {},
      isActive: true,
    },
  });

  // 6. Shift kasir aktif (supaya checkout POS bisa langsung dicoba)
  let cashSession = await prisma.cashSession.findFirst({
    where: { userId: cashier.id, closedAt: null },
  });

  if (!cashSession) {
    cashSession = await prisma.cashSession.create({
      data: { userId: cashier.id, openingCash: 200000 },
    });
  }

  console.log("");
  console.log("=== KREDENSIAL DEBUG ===");
  console.log(`Admin  : ${DEBUG_ADMIN.email} / ${DEBUG_ADMIN.password}`);
  console.log(`Kasir  : NIK ${DEBUG_CASHIER.nik} / PIN ${DEBUG_CASHIER.pin}`);
  console.log(`Admin ID: ${admin.id}`);
  console.log(`Kasir ID: ${cashier.id}`);
  console.log(`Cash session aktif: ${cashSession.id}`);
  console.log("");
  console.log("Jangan pakai data ini di production.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
