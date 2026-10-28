import { NextRequest, NextResponse } from "next/server";
import { authenticatePasswordUser } from "@/lib/authenticateUser";
import {
  clearAdminLoginFailures,
  isAdminLoginLocked,
  recordAdminLoginFailure,
} from "@/lib/adminLoginRateLimit";

export async function POST(req: NextRequest) {
  try {
    const { email, password, expectedArea } = await req.json();

    if (!email || !password)
      return NextResponse.json(
        { error: "Email & password wajib diisi" },
        { status: 400 }
      );
    if (!["dashboard", "pos"].includes(expectedArea))
      return NextResponse.json(
        { error: "Pilih area login yang valid" },
        { status: 400 }
      );

    const normalizedEmail = String(email).trim().toLowerCase();
    const forwardedIp =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
    const clientIp = req.headers.get("x-real-ip")?.trim() || forwardedIp || "unknown";

    if (await isAdminLoginLocked(normalizedEmail, clientIp)) {
      return NextResponse.json(
        { error: "Terlalu banyak percobaan login. Coba lagi nanti." },
        { status: 429 }
      );
    }

    const result = await authenticatePasswordUser(
      normalizedEmail,
      password,
      expectedArea as "dashboard" | "pos"
    );

    if (!result.ok) {
      if (result.reason === "forbidden") {
        return NextResponse.json(
          {
            error:
              expectedArea === "dashboard"
                ? "Akun ini tidak memiliki akses Dashboard."
                : "Akun ini tidak memiliki akses POS.",
          },
          { status: 403 }
        );
      }
      await recordAdminLoginFailure(
        normalizedEmail,
        clientIp,
        result.accountExists
      );
      return NextResponse.json(
        { error: "Email atau password tidak valid." },
        { status: 401 }
      );
    }

    await clearAdminLoginFailures(normalizedEmail);
    return NextResponse.json(
      {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
        role: result.user.role,
        permissions: result.user.permissions,
        isActive: result.user.isActive,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Terjadi kesalahan" }, { status: 500 });
  }
}
