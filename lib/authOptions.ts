import { createHash, randomBytes } from "crypto";
import bcrypt from "bcrypt";
import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import prisma from "@/lib/prisma";
import type { UserPermissions } from "@/lib/permissions";
import { hasPermission, normalizePermissions } from "@/lib/permissions";
import {
  clearCashierLoginFailures,
  isCashierLoginLocked,
  recordCashierLoginFailure,
} from "@/lib/cashierLoginRateLimit";
import {
  clearAdminLoginFailures,
  isAdminLoginLocked,
  recordAdminLoginFailure,
} from "@/lib/adminLoginRateLimit";
import { authenticatePasswordUser } from "@/lib/authenticateUser";

const DUMMY_PIN_HASH =
  "$2b$12$m2zY1muuMEIsflosdWFRhOGtNKt/u5t.iuk7fIii20Bv1U6kcmkgu";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
        nik: { label: "NIK", type: "text" },
        pin: { label: "PIN", type: "password" },
        area: { label: "Area aplikasi", type: "text" },
      },
      async authorize(credentials, request) {
        if (credentials?.area === "cashier") {
          const nik =
            typeof credentials.nik === "string"
              ? credentials.nik.trim()
              : "";
          const pin = typeof credentials.pin === "string" ? credentials.pin : "";
          if (!/^\d{6,20}$/.test(nik) || !/^\d{4,12}$/.test(pin)) {
            return null;
          }
          const forwardedIp =
            request.headers?.["x-forwarded-for"]?.split(",")[0]?.trim();
          const clientIp =
            request.headers?.["x-real-ip"]?.trim() || forwardedIp || "unknown";
          if (await isCashierLoginLocked(nik, clientIp)) return null;

          const user = await prisma.user.findUnique({
            where: { nik },
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              permissions: true,
              isActive: true,
              pinHash: true,
            },
          });
          const pinMatches = await bcrypt.compare(
            pin,
            user?.pinHash || DUMMY_PIN_HASH
          );
          const permissions = normalizePermissions(user?.permissions);
          if (
            !user ||
            !pinMatches ||
            !user.isActive ||
            user.role !== "CASHIER" ||
            !user.pinHash ||
            !hasPermission(user.role, permissions, "pos", "view")
          ) {
            await recordCashierLoginFailure(nik, clientIp, Boolean(user));
            return null;
          }
          await clearCashierLoginFailures(nik);
          return {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            permissions: permissions as UserPermissions,
            isActive: user.isActive,
            authMethod: "nik-pin",
          };
        }

        if (
          !credentials?.email ||
          !credentials?.password ||
          !["dashboard", "pos"].includes(credentials.area || "")
        ) {
          return null;
        }

        const email = String(credentials.email).trim().toLowerCase();
        const password = String(credentials.password);
        const area = credentials.area as "dashboard" | "pos";

        const headers = (request?.headers || {}) as Record<string, string | string[] | undefined>;
        const forwardedRaw = headers["x-forwarded-for"];
        const forwardedIp =
          (Array.isArray(forwardedRaw) ? forwardedRaw[0] : forwardedRaw)
            ?.split(",")[0]
            ?.trim();
        const realIpRaw = headers["x-real-ip"];
        const realIp = Array.isArray(realIpRaw) ? realIpRaw[0] : realIpRaw;
        const clientIp = realIp?.trim() || forwardedIp || "unknown";

        if (await isAdminLoginLocked(email, clientIp)) return null;

        const result = await authenticatePasswordUser(email, password, area);
        if (!result.ok) {
          if (result.reason === "invalid") {
            await recordAdminLoginFailure(email, clientIp, result.accountExists);
          }
          return null;
        }
        await clearAdminLoginFailures(email);
        return {
          id: result.user.id.toString(),
          name: result.user.name,
          email: result.user.email,
          role: result.user.role,
          permissions: result.user.permissions as UserPermissions,
          isActive: result.user.isActive,
          authMethod: "password",
        };
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: { signIn: "/auth" },
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider !== "google" || !user.email) return true;

      const email = user.email.trim().toLowerCase();
      const existingUser = await prisma.user.findUnique({
        where: { email },
        select: { isActive: true, role: true },
      });
      if (existingUser) {
        return existingUser.isActive && existingUser.role === "ADMIN";
      }
      const deletedEmailHash = createHash("sha256")
        .update(email)
        .digest("hex");
      const deletedUser = await prisma.user.findFirst({
        where: { deletedEmailHash },
        select: { id: true },
      });
      if (deletedUser) return false;

      const firstUser = (await prisma.user.count()) === 0;
      const bootstrapAllowed =
        process.env.ALLOW_GOOGLE_ADMIN_BOOTSTRAP !== "false";
      if (!firstUser || !bootstrapAllowed) return false;
      const password = await bcrypt.hash(randomBytes(32).toString("hex"), 10);
      await prisma.user.create({
        data: {
          name: user.name || user.email,
          email,
          password,
          role: "ADMIN",
        },
      });
      return true;
    },
    async jwt({ token, user }) {
      if (user?.authMethod) token.authMethod = user.authMethod;
      const email = user?.email?.trim().toLowerCase();
      const dbUser = email
        ? await prisma.user.findUnique({
            where: { email },
            select: { id: true, role: true, permissions: true, isActive: true },
          })
        : token.sub
        ? await prisma.user.findUnique({
            where: { id: token.sub },
            select: { id: true, role: true, permissions: true, isActive: true },
          })
        : null;
      if (dbUser) {
        token.sub = dbUser.id;
        token.role = dbUser.isActive ? dbUser.role : "DISABLED";
        token.permissions = dbUser.isActive
          ? (dbUser.permissions as UserPermissions)
          : {};
        token.isActive = dbUser.isActive;
      } else if (token.sub) {
        token.role = "DISABLED";
        token.permissions = {};
        token.isActive = false;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub || "";
        session.user.authMethod = token.authMethod;
        session.user.role = token.isActive === false
          ? "DISABLED"
          : token.role || "CASHIER";
        session.user.permissions =
          token.isActive === false ? {} : token.permissions || {};
        session.user.isActive = token.isActive !== false;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      return url.startsWith(baseUrl) ? url : baseUrl;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development",
};
