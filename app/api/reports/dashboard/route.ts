import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    // === Batas waktu hari ini ===
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    // === Hitung total produk, kategori, pelanggan, faktur ===
    const [totalProducts, totalCategories, totalCustomers, totalInvoices] =
      await Promise.all([
        prisma.product.count(),
        prisma.category.count(),
        prisma.customer.count(),
        prisma.invoice.count(),
      ]);

    // === Hitung total pendapatan hari ini langsung dari invoiceItem ===
    const invoiceItemsToday = await prisma.invoiceItem.findMany({
      where: {
        invoice: {
          createdAt: { gte: startOfToday, lt: endOfToday },
        },
      },
      select: {
        price: true,
        qty: true,
      },
    });

    const totalRevenue = invoiceItemsToday.reduce(
      (sum, item) => sum + Number(item.price) * Number(item.qty),
      0
    );

    // === Penjualan 7 Hari Terakhir ===
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

    const invoicesLast7Days = await prisma.invoice.findMany({
      where: { createdAt: { gte: sevenDaysAgo } },
      select: { id: true, createdAt: true },
    });

    const invoiceItemsLast7Days = await prisma.invoiceItem.findMany({
      where: {
        invoiceId: { in: invoicesLast7Days.map((i) => i.id) },
      },
      select: {
        price: true,
        qty: true,
        invoice: { select: { createdAt: true } },
      },
    });

    // Buat agregasi per tanggal
    const salesMap = new Map<string, number>();
    for (const item of invoiceItemsLast7Days) {
      const day = new Date(item.invoice.createdAt).toDateString().toString();
      const total = Number(item.price) * Number(item.qty);
      salesMap.set(day, (salesMap.get(day) || 0) + total);
    }

    const salesData = Array.from({ length: 7 }).map((_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      const label = date.toLocaleDateString("id-ID", { weekday: "short" });
      const total = salesMap.get(date.toDateString()) || 0;
      return { date: label, total };
    });

    // === Produk Terlaris Hari Ini ===
    const topProductsToday = await prisma.invoiceItem.groupBy({
      by: ["productId"],
      _sum: { qty: true },
      where: {
        invoice: {
          createdAt: { gte: startOfToday, lt: endOfToday },
        },
      },
      orderBy: { _sum: { qty: "desc" } },
      take: 5,
    });

    const productIds = topProductsToday.map((p) => p.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true, price: true, imageUrl: true, sku: true },
    });

    const topProducts = topProductsToday.map((p) => {
      const prod = products.find((x) => x.id === p.productId);
      return {
        name: prod?.name ?? "Tidak diketahui",
        sold: p._sum.qty || 0,
        price: Number(prod?.price || 0),
        imageUrl: prod?.imageUrl || null,
        sku: prod?.sku || null,
      };
    });

    // === Return semua data ke frontend ===
    return NextResponse.json({
      totalProducts,
      totalCategories,
      totalInvoices,
      totalCustomers,
      totalRevenue,
      salesData,
      topProducts,
    });
  } catch (error) {
    console.error("Error dashboard:", error);
    return NextResponse.json(
      { error: "Failed to load dashboard data" },
      { status: 500 }
    );
  }
}
