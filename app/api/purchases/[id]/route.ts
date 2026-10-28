import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { hasPermission } from "@/lib/permissions";
import prisma from "@/lib/prisma";

export async function PUT(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await getServerSession(authOptions);
  if (!auth?.user?.id) {
    return NextResponse.json({ error: "Autentikasi diperlukan" }, { status: 401 });
  }
  if (!hasPermission(auth.user.role, auth.user.permissions, "purchases", "update")) {
    return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
  }
  try {
    const { id } = await context.params;
    const purchaseId = Number(id);
    if (!Number.isInteger(purchaseId) || purchaseId <= 0) {
      return NextResponse.json(
        { error: "ID pembelian tidak valid" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const {
      supplierId,
      locationId,
      items,
      date,
      termin,
      dueDate,
      refNo,
      buyer,
      notes,
      discount = 0,
      shipping = 0,
    } = body;

    if (!supplierId || !locationId || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Data pembelian tidak lengkap" },
        { status: 400 }
      );
    }

    const existingPurchase = await prisma.purchase.findUnique({
      where: { id: purchaseId },
    });
    if (!existingPurchase) {
      return NextResponse.json(
        { error: "Data pembelian tidak ditemukan" },
        { status: 404 }
      );
    }
    const receiptCount = await prisma.purchaseReceipt.count({
      where: { purchaseId },
    });
    if (receiptCount > 0) {
      return NextResponse.json(
        {
          error:
            "Pembelian tidak dapat diubah setelah proses penerimaan barang dimulai",
        },
        { status: 409 }
      );
    }

    const [supplier, location] = await Promise.all([
      prisma.customer.findUnique({ where: { id: Number(supplierId) } }),
      prisma.location.findUnique({ where: { id: Number(locationId) } }),
    ]);

    if (!supplier || supplier.type !== "supplier") {
      return NextResponse.json(
        { error: "Pemasok tidak ditemukan atau bukan pemasok" },
        { status: 400 }
      );
    }
    if (!location) {
      return NextResponse.json(
        { error: "Lokasi tidak ditemukan" },
        { status: 404 }
      );
    }

    const purchaseItemsData = items
      .filter((item: any) => item.productId)
      .map((item: any) => {
        const qty = Number(item.qty);
        const price = Number(item.price);
        return {
          productId: Number(item.productId),
          qty,
          price,
          subtotal: qty * price,
        };
      });

    if (
      purchaseItemsData.length === 0 ||
      purchaseItemsData.some(
        (item: any) =>
          !Number.isInteger(item.productId) ||
          !Number.isFinite(item.qty) ||
          item.qty <= 0 ||
          !Number.isFinite(item.price) ||
          item.price < 0
      )
    ) {
      return NextResponse.json(
        { error: "Data produk pembelian tidak valid" },
        { status: 400 }
      );
    }

    const subtotal = purchaseItemsData.reduce(
      (sum: number, item: any) => sum + item.subtotal,
      0
    );
    const totalAmount = subtotal + Number(shipping || 0) - Number(discount || 0);

    const updatedPurchase = await prisma.purchase.update({
      where: { id: purchaseId },
      data: {
        supplierId: Number(supplierId),
        locationId: Number(locationId),
        refNo: refNo || null,
        buyer: buyer || null,
        date: date ? new Date(date) : null,
        termin: Number(termin || 0),
        dueDate: dueDate ? new Date(dueDate) : null,
        notes: notes || null,
        discount: Number(discount || 0),
        shipping: Number(shipping || 0),
        totalAmount,
        items: {
          deleteMany: {},
          create: purchaseItemsData,
        },
      },
      include: {
        supplier: { select: { name: true } },
        location: { select: { name: true } },
        items: {
          include: { product: { select: { id: true, name: true, sku: true } } },
        },
      },
    });

    return NextResponse.json(updatedPurchase);
  } catch (err) {
    console.error("❌ Error update purchase:", err);
    return NextResponse.json(
      { error: "Gagal memperbarui data pembelian" },
      { status: 500 }
    );
  }
}

// ✅ GET: Ambil detail 1 purchase
export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await getServerSession(authOptions);
  if (!auth?.user?.id) {
    return NextResponse.json({ error: "Autentikasi diperlukan" }, { status: 401 });
  }
  if (!hasPermission(auth.user.role, auth.user.permissions, "purchases", "view")) {
    return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
  }
  try {
    const { id } = await context.params;

    const purchase = await prisma.purchase.findUnique({
      where: { id: Number(id) },
      include: {
        supplier: { select: { name: true, phone: true, address: true } },
        location: { select: { name: true } },
        items: {
          include: { product: { select: { id: true, name: true, sku: true } } },
        },
      },
    });

    if (!purchase) {
      return NextResponse.json(
        { error: "Data pembelian tidak ditemukan" },
        { status: 404 }
      );
    }

    return NextResponse.json(purchase, { status: 200 });
  } catch (err) {
    console.error("❌ Error get purchase detail:", err);
    return NextResponse.json(
      { error: "Gagal mengambil detail pembelian" },
      { status: 500 }
    );
  }
}

// ✅ DELETE: Hapus purchase
export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await getServerSession(authOptions);
  if (!auth?.user?.id) {
    return NextResponse.json({ error: "Autentikasi diperlukan" }, { status: 401 });
  }
  if (!hasPermission(auth.user.role, auth.user.permissions, "purchases", "delete")) {
    return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
  }
  try {
    const { id } = await context.params;
    const purchaseId = Number(id);
    if (!Number.isSafeInteger(purchaseId) || purchaseId <= 0) {
      return NextResponse.json(
        { error: "ID pembelian tidak valid" },
        { status: 400 }
      );
    }

    const receiptCount = await prisma.purchaseReceipt.count({
      where: { purchaseId },
    });
    if (receiptCount > 0) {
      return NextResponse.json(
        {
          error:
            "Pembelian tidak dapat dihapus karena sudah memiliki riwayat penerimaan",
        },
        { status: 409 }
      );
    }

    // Hapus item-item purchase dulu (jika relasi)
    await prisma.purchaseItem.deleteMany({
      where: { purchaseId },
    });

    // Lalu hapus purchase utamanya
    await prisma.purchase.delete({
      where: { id: purchaseId },
    });

    return NextResponse.json({ message: "Data pembelian berhasil dihapus" });
  } catch (err) {
    console.error("❌ Error delete purchase:", err);
    return NextResponse.json(
      { error: "Gagal menghapus data pembelian" },
      { status: 500 }
    );
  }
}
