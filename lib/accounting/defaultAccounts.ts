import prisma from "@/lib/prisma";

export interface DefaultAccountDef {
  code: string;
  name: string;
  type: "ASSET" | "LIABILITY" | "EQUITY" | "REVENUE" | "EXPENSE";
  normalBalance: "DEBIT" | "CREDIT";
  category: string;
  description: string;
}

export const DEFAULT_ACCOUNTS: DefaultAccountDef[] = [
  {
    code: "1-1001",
    name: "Kas di Tangan (Kasir POS)",
    type: "ASSET",
    normalBalance: "DEBIT",
    category: "CASH",
    description: "Uang kas fisik di laci kasir untuk transaksi POS",
  },
  {
    code: "1-1002",
    name: "Bank Rekening Operasional",
    type: "ASSET",
    normalBalance: "DEBIT",
    category: "BANK",
    description: "Rekening bank operasional utama perusahaan",
  },
  {
    code: "1-1003",
    name: "Kliring QRIS (Midtrans Escrow)",
    type: "ASSET",
    normalBalance: "DEBIT",
    category: "BANK",
    description: "Penampungan saldo transaksi QRIS sebelum ditarik ke bank",
  },
  {
    code: "1-1200",
    name: "Piutang Usaha (A/R)",
    type: "ASSET",
    normalBalance: "DEBIT",
    category: "RECEIVABLE",
    description: "Piutang atas faktur penjualan tempo kepada pelanggan",
  },
  {
    code: "1-1300",
    name: "Persediaan Barang Dagang",
    type: "ASSET",
    normalBalance: "DEBIT",
    category: "INVENTORY",
    description: "Nilai buku persediaan barang dagang di seluruh gudang",
  },
  {
    code: "1-1399",
    name: "Persediaan Belum Ditagih (GRNI)",
    type: "ASSET",
    normalBalance: "DEBIT",
    category: "INVENTORY",
    description: "Barang yang sudah diterima dari supplier namun belum ada tagihan invoice",
  },
  {
    code: "2-1100",
    name: "Hutang Usaha (A/P)",
    type: "LIABILITY",
    normalBalance: "CREDIT",
    category: "PAYABLE",
    description: "Kewajiban hutang kepada pemasok / supplier",
  },
  {
    code: "2-1200",
    name: "Hutang PPN Keluaran",
    type: "LIABILITY",
    normalBalance: "CREDIT",
    category: "TAX",
    description: "Pajak Pertambahan Nilai yang dipungut dari penjualan",
  },
  {
    code: "3-1000",
    name: "Modal Disetor",
    type: "EQUITY",
    normalBalance: "CREDIT",
    category: "EQUITY",
    description: "Modal awal yang disetorkan pemilik usaha",
  },
  {
    code: "3-2000",
    name: "Saldo Laba Ditahan",
    type: "EQUITY",
    normalBalance: "CREDIT",
    category: "EQUITY",
    description: "Akumulasi laba periode sebelumnya yang ditahan",
  },
  {
    code: "4-1000",
    name: "Pendapatan Penjualan Barang",
    type: "REVENUE",
    normalBalance: "CREDIT",
    category: "SALES",
    description: "Pendapatan dari penjualan produk (POS & Faktur)",
  },
  {
    code: "4-1090",
    name: "Potongan / Diskon Penjualan",
    type: "REVENUE",
    normalBalance: "DEBIT",
    category: "SALES_DISCOUNT",
    description: "Diskon yang diberikan kepada pelanggan (mengurangi pendapatan)",
  },
  {
    code: "5-1000",
    name: "Beban Pokok Penjualan (HPP)",
    type: "EXPENSE",
    normalBalance: "DEBIT",
    category: "COGS",
    description: "Harga pokok perolehan dari produk yang berhasil terjual",
  },
  {
    code: "5-1990",
    name: "Beban Selisih Stok (Stock Opname Loss)",
    type: "EXPENSE",
    normalBalance: "DEBIT",
    category: "INVENTORY_VARIANCE",
    description: "Beban akibat selisih barang rusak atau hilang saat penyesuaian stok",
  },
  {
    code: "6-1050",
    name: "Beban Biaya Transaksi & MDR",
    type: "EXPENSE",
    normalBalance: "DEBIT",
    category: "OPERATING_EXPENSE",
    description: "Biaya potongan MDR payment gateway (QRIS/Midtrans) atau biaya admin bank",
  },
  {
    code: "6-1090",
    name: "Beban Operasional Umum",
    type: "EXPENSE",
    normalBalance: "DEBIT",
    category: "OPERATING_EXPENSE",
    description: "Biaya operasional lainnya sehari-hari",
  },
];

export async function ensureDefaultAccountsExist() {
  for (const acc of DEFAULT_ACCOUNTS) {
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
}

