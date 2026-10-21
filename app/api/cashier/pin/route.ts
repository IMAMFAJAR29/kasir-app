import bcrypt from "bcrypt";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/authOptions";
import {
  clearCashierLoginFailures,
  isCashierLoginLocked,
  recordCashierLoginFailure,
} from "@/lib/cashierLoginRateLimit";
import { hasPermission } from "@/lib/permissions";
import prisma from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (
    !session?.user?.id ||
    session.user.role !== "CASHIER" ||
    session.user.authMethod !== "nik-pin" ||
    !hasPermission(
      session.user.role,
      session.user.permissions,
      "pos",
      "view"
    )
  ) {
    return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Data permintaan tidak valid." }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Data permintaan tidak valid." }, { status: 400 });
  }
  const { currentPin, newPin, confirmPin } = body as Record<string, unknown>;
  if (
    typeof currentPin !== "string" ||
    typeof newPin !== "string" ||
    typeof confirmPin !== "string"
  ) {
    return NextResponse.json({ error: "Semua kolom PIN wajib diisi." }, { status: 400 });
  }
  if (!/^\d{4,12}$/.test(currentPin)) {
    return NextResponse.json({ error: "PIN saat ini tidak sesuai." }, { status: 400 });
  }
  if (!/^\d{6,12}$/.test(newPin)) {
    return NextResponse.json(
      { error: "PIN baru harus terdiri dari 6–12 digit angka." },
      { status: 400 }
    );
  }
  if (newPin !== confirmPin) {
    return NextResponse.json({ error: "Konfirmasi PIN baru tidak cocok." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, nik: true, pinHash: true, isActive: true, role: true },
  });
  if (
    !user ||
    !user.isActive ||
    user.role !== "CASHIER" ||
    !user.nik ||
    !user.pinHash
  ) {
    return NextResponse.json(
      { error: "Akun kasir tidak dapat mengubah PIN saat ini." },
      { status: 403 }
    );
  }

  const clientIp =
    request.headers.get("x-real-ip")?.trim() ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown";
  if (await isCashierLoginLocked(user.nik, clientIp)) {
    return NextResponse.json(
      { error: "Terlalu banyak percobaan. Coba lagi setelah 15 menit." },
      { status: 429 }
    );
  }

  if (!(await bcrypt.compare(currentPin, user.pinHash))) {
    await recordCashierLoginFailure(user.nik, clientIp, true);
    return NextResponse.json({ error: "PIN saat ini tidak sesuai." }, { status: 401 });
  }
  await clearCashierLoginFailures(user.nik);

  if (await bcrypt.compare(newPin, user.pinHash)) {
    return NextResponse.json(
      { error: "Gunakan PIN baru yang berbeda dari PIN saat ini." },
      { status: 400 }
    );
  }

  const pinHash = await bcrypt.hash(newPin, 12);
  const result = await prisma.user.updateMany({
    where: {
      id: user.id,
      role: "CASHIER",
      isActive: true,
      pinHash: user.pinHash,
    },
    data: { pinHash },
  });
  if (result.count !== 1) {
    return NextResponse.json(
      { error: "Akun atau PIN baru saja berubah. Muat ulang lalu coba lagi." },
      { status: 409 }
    );
  }

  return NextResponse.json({ success: true });
}
