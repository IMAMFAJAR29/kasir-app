import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import { getRequiredPermission, hasPermission } from "@/lib/permissions";

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
      return NextResponse.redirect(new URL("/auth", request.url));
    }

    if (token.isActive === false) {
      if (isApiRoute) {
        return NextResponse.json({ error: "Akun pengguna sudah dinonaktifkan." }, { status: 401 });
      }
      return NextResponse.redirect(new URL("/auth", request.url));
    }

    if (pathname === "/") {
      if (token.role === "CASHIER") {
        return NextResponse.redirect(new URL("/pos", request.url));
      }
      if (hasPermission(token.role, token.permissions, "dashboard", "view")) {
        return NextResponse.redirect(new URL("/admin/dashboard", request.url));
      }
      if (hasPermission(token.role, token.permissions, "pos", "view")) {
        return NextResponse.redirect(new URL("/pos", request.url));
      }
      if (hasPermission(token.role, token.permissions, "systemSettings", "view")) {
        return NextResponse.redirect(new URL("/admin/settings", request.url));
      }
      return NextResponse.redirect(new URL("/auth", request.url));
    }

    const requiredPermission = getRequiredPermission(pathname, method);
    const isAllowed =
      requiredPermission &&
      hasPermission(
        token.role,
        token.permissions,
        requiredPermission.module,
        requiredPermission.action
      );
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
    "/((?!_next|favicon.ico|Logo\\.png\\.png|sw\\.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$|auth|api/auth).*)",
  ],
};
