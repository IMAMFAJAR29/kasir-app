import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// ✅ GET: Ambil semua purchase
export async function GET() {
  try {
    const purchases = await prisma.purchase.findMany({
      include: {
        supplier: { select: { name: true } },
        location: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const formatted = purchases.map((po) => ({
      id: po.id,
      purchaseNumber: po.purchaseNumber,
      createdAt: po.createdAt,
      totalAmount: po.totalAmount,
      status: po.status,
      supplierName: po.supplier?.name ?? "-",
      locationName: po.location?.name ?? "-",
    }));

    return NextResponse.json(formatted, { status: 200 });
  } catch (err) {
    console.error("❌ Error get purchases:", err);
    return NextResponse.json(
      { error: "Gagal mengambil daftar pembelian" },
      { status: 500 }
    );
  }
}

// ✅ POST: Buat purchase baru
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      supplierId,
      locationId,
      items,
      dueDate,
      refNo,
      notes,
      discount = 0,
      shipping = 0,
      buyer,
    } = body;

    if (!supplierId || !locationId || !items || items.length === 0)
      return NextResponse.json(
        { error: "Data pembelian tidak lengkap" },
        { status: 400 }
      );

    // 🔹 Validasi supplier & lokasi
    const [supplier, location] = await Promise.all([
      prisma.customer.findUnique({ where: { id: Number(supplierId) } }),
      prisma.location.findUnique({ where: { id: Number(locationId) } }),
    ]);

    if (!supplier)
      return NextResponse.json(
        { error: "Pemasok tidak ditemukan" },
        { status: 404 }
      );

    if (supplier.type !== "supplier")
      return NextResponse.json(
        { error: "Kontak ini bukan pemasok" },
        { status: 400 }
      );

    if (!location)
      return NextResponse.json(
        { error: "Lokasi tidak ditemukan" },
        { status: 404 }
      );

    // 🔹 Hitung subtotal dan data item
    let subtotal = 0;
    const purchaseItemsData = items
      .filter((item: any) => item.productId)
      .map((item: any) => {
        const itemSubtotal = (item.qty || 0) * (item.price || 0);
        subtotal += itemSubtotal;
        return {
          productId: Number(item.productId),
          qty: Number(item.qty),
          price: Number(item.price),
          subtotal: itemSubtotal,
        };
      });

    if (purchaseItemsData.length === 0)
      return NextResponse.json(
        { error: "Semua item harus memiliki productId" },
        { status: 400 }
      );

    const totalAmount = subtotal + Number(shipping) - Number(discount);

    // 🔹 Generate nomor pembelian unik
    const now = new Date();
    const purchaseNumber = `PO-${now.getFullYear()}${String(
      now.getMonth() + 1
    ).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${Date.now()}`;

    // 🔹 Simpan ke database
    const purchase = await prisma.purchase.create({
      data: {
        purchaseNumber,
        supplierId: Number(supplierId),
        locationId: Number(locationId),
        refNo: refNo || null,
        notes: notes || null,
        buyer: buyer || null,
        discount,
        shipping,
        totalAmount,
        paidAmount: 0,
        status: "unpaid",
        dueDate: dueDate ? new Date(dueDate) : null,
        items: { create: purchaseItemsData },
      },
      include: {
        supplier: { select: { name: true } },
        location: { select: { name: true } },
        items: true,
      },
    });

    return NextResponse.json(purchase, { status: 201 });
  } catch (err) {
    console.error("❌ Error create purchase:", err);
    return NextResponse.json(
      { error: "Gagal membuat data pembelian" },
      { status: 500 }
    );
  }
}
