import { default as authMiddleware } from "next-auth/middleware";

export default authMiddleware;

export const config = {
  matcher: [
    // Lindungi semua halaman kecuali:
    // - API routes
    // - Next.js internal (_next)
    // - Static files (favicon.ico, images, dsb)
    // - Halaman auth seperti login/register
    "/((?!api|_next|favicon.ico|auth|login|register).*)",
  ],
};
