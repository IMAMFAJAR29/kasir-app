import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import {
  getRequiredPermission,
  hasPermission,
  canReadPosSupportData,
  canManagePosRegisters,
} from "@/lib/permissions";

export default withAuth(
  function middleware(request) {
    const token = request.nextauth.token;
    const pathname = request.nextUrl.pathname;
    const method = request.method.toUpperCase();
    const isApiRoute = pathname.startsWith("/api/");

    if (!token) {
      if (isApiRoute) {
        return NextResponse.json({ error: "Autentikasi diperlukan" }, { status: 401 });
      }
      if (pathname === "/pos" || pathname.startsWith("/pos/")) {
        const authUrl = new URL("/auth", request.url);
        authUrl.searchParams.set("redirect", "/pos/back-office");
        return NextResponse.redirect(authUrl);
      }
      return NextResponse.redirect(new URL("/auth", request.url));
    }

    if (token.isActive === false) {
      if (isApiRoute) {
        return NextResponse.json({ error: "Akun pengguna sudah dinonaktifkan." }, { status: 401 });
      }
      return NextResponse.redirect(new URL("/auth", request.url));
    }

    if (token.role === "CASHIER" && token.authMethod !== "nik-pin") {
      if (isApiRoute) {
        return NextResponse.json(
          { error: "Kasir harus login menggunakan NIK dan PIN." },
          { status: 401 }
        );
      }
      return NextResponse.redirect(new URL("/auth?redirect=%2Fpos%2Fback-office", request.url));
    }

    if (pathname === "/") {
      if (token.role === "CASHIER") {
        return NextResponse.redirect(new URL("/pos/back-office", request.url));
      }
      if (hasPermission(token.role, token.permissions, "dashboard", "view")) {
        return NextResponse.redirect(new URL("/admin/dashboard", request.url));
      }
      if (hasPermission(token.role, token.permissions, "pos", "view")) {
        return NextResponse.redirect(new URL("/pos/back-office", request.url));
      }
      if (hasPermission(token.role, token.permissions, "systemSettings", "view")) {
        return NextResponse.redirect(new URL("/admin/settings", request.url));
      }
      return NextResponse.redirect(new URL("/auth", request.url));
    }

    const requiredPermission = getRequiredPermission(pathname, method);
    const isRegisterWrite =
      /^\/api\/pos-registers(?:\/|$)/.test(pathname) && method !== "GET";
    const isAllowed =
      (requiredPermission &&
        hasPermission(
          token.role,
          token.permissions,
          requiredPermission.module,
          requiredPermission.action
        ) &&
        (!isRegisterWrite ||
          canManagePosRegisters(token.role, token.permissions, method))) ||
      canReadPosSupportData(token.role, token.permissions, pathname, method);
    if (isAllowed) return NextResponse.next();

    if (isApiRoute) {
      return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
    }

    return NextResponse.redirect(new URL("/auth", request.url));
  },
  {
    callbacks: {
      authorized: () => true,
    },
  }
);

export const config = {
  matcher: [
    "/((?!_next|favicon.ico|Logo\\.png\\.png|sw\\.js|templates|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|xlsx|xls|csv)$|auth|api/auth).*)",
  ],
};
