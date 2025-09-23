// middleware.ts
import { default as authMiddleware } from "next-auth/middleware";

export { authMiddleware as default };

export const config = {
  matcher: ["/((?!api|_next|favicon.ico|login|register).*)"],
  // exclude login page, API, nextjs internal
};
