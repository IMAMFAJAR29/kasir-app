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

  // 🌱 Seeding Default Chart of Accounts
  console.log("🌱 Seeding default Chart of Accounts (COA)...");
  const defaultAccounts = [
    { code: "1-1001", name: "Kas di Tangan (Kasir POS)", type: "ASSET", normalBalance: "DEBIT", category: "CASH", description: "Uang kas fisik di laci kasir" },
    { code: "1-1002", name: "Bank Rekening Operasional", type: "ASSET", normalBalance: "DEBIT", category: "BANK", description: "Rekening bank operasional utama" },
    { code: "1-1003", name: "Kliring QRIS (Midtrans Escrow)", type: "ASSET", normalBalance: "DEBIT", category: "BANK", description: "Penampungan saldo transaksi QRIS" },
    { code: "1-1200", name: "Piutang Usaha (A/R)", type: "ASSET", normalBalance: "DEBIT", category: "RECEIVABLE", description: "Piutang atas faktur penjualan tempo" },
    { code: "1-1300", name: "Persediaan Barang Dagang", type: "ASSET", normalBalance: "DEBIT", category: "INVENTORY", description: "Nilai persediaan barang dagang" },
    { code: "1-1399", name: "Persediaan Belum Ditagih (GRNI)", type: "ASSET", normalBalance: "DEBIT", category: "INVENTORY", description: "Barang diterima namun belum ada tagihan invoice" },
    { code: "2-1100", name: "Hutang Usaha (A/P)", type: "LIABILITY", normalBalance: "CREDIT", category: "PAYABLE", description: "Kewajiban hutang kepada pemasok" },
    { code: "2-1200", name: "Hutang PPN Keluaran", type: "LIABILITY", normalBalance: "CREDIT", category: "TAX", description: "Pajak Pertambahan Nilai penjualan" },
    { code: "3-1000", name: "Modal Disetor", type: "EQUITY", normalBalance: "CREDIT", category: "EQUITY", description: "Modal awal pemilik usaha" },
    { code: "3-2000", name: "Saldo Laba Ditahan", type: "EQUITY", normalBalance: "CREDIT", category: "EQUITY", description: "Akumulasi laba periode lalu" },
    { code: "4-1000", name: "Pendapatan Penjualan Barang", type: "REVENUE", normalBalance: "CREDIT", category: "SALES", description: "Pendapatan dari penjualan produk" },
    { code: "4-1090", name: "Potongan / Diskon Penjualan", type: "REVENUE", normalBalance: "DEBIT", category: "SALES_DISCOUNT", description: "Diskon yang diberikan kepada pelanggan" },
    { code: "5-1000", name: "Beban Pokok Penjualan (HPP)", type: "EXPENSE", normalBalance: "DEBIT", category: "COGS", description: "Harga pokok modal produk terjual" },
    { code: "5-1990", name: "Beban Selisih Stok (Stock Opname)", type: "EXPENSE", normalBalance: "DEBIT", category: "INVENTORY_VARIANCE", description: "Selisih barang hilang/rusak saat opname" },
    { code: "6-1050", name: "Beban Biaya Transaksi & MDR", type: "EXPENSE", normalBalance: "DEBIT", category: "OPERATING_EXPENSE", description: "Potongan fee gateway dan admin bank" },
    { code: "6-1090", name: "Beban Operasional Umum", type: "EXPENSE", normalBalance: "DEBIT", category: "OPERATING_EXPENSE", description: "Biaya operasional lainnya" },
  ];

  for (const acc of defaultAccounts) {
    await prisma.account.upsert({
      where: { code: acc.code },
      update: {
        name: acc.name,
        type: acc.type,
        normalBalance: acc.normalBalance,
        category: acc.category,
        description: acc.description,
        isSystem: true,
      },
      create: {
        code: acc.code,
        name: acc.name,
        type: acc.type,
        normalBalance: acc.normalBalance,
        category: acc.category,
        description: acc.description,
        isSystem: true,
        isActive: true,
      },
    });
  }

  console.log("✅ Default Chart of Accounts seeded!");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
