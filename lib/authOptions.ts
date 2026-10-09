import { createHash, randomBytes } from "crypto";
import bcrypt from "bcrypt";
import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import prisma from "@/lib/prisma";
import type { UserPermissions } from "@/lib/permissions";

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
        area: { label: "Area aplikasi", type: "text" },
      },
      async authorize(credentials) {
        if (
          !credentials?.email ||
          !credentials?.password ||
          !["dashboard", "pos"].includes(credentials.area || "")
        ) {
          return null;
        }

        try {
          const response = await fetch(
            `${process.env.NEXTAUTH_URL}/api/auth/login`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                email: credentials.email,
                password: credentials.password,
                expectedArea: credentials.area,
              }),
            }
          );
          const user = await response.json();
          if (!response.ok || !user?.id) return null;
          return {
            id: user.id.toString(),
            name: user.name,
            email: user.email,
            role: user.role,
            permissions: user.permissions as UserPermissions,
            isActive: user.isActive,
          };
        } catch (error) {
          console.error("Authorize error:", error);
          return null;
        }
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
        select: { isActive: true },
      });
      if (existingUser && !existingUser.isActive) return false;
      const deletedEmailHash = createHash("sha256")
        .update(email)
        .digest("hex");
      const deletedUser = await prisma.user.findFirst({
        where: { deletedEmailHash },
        select: { id: true },
      });
      if (deletedUser) return false;

      const randomPassword = randomBytes(32).toString("hex");
      const password = await bcrypt.hash(randomPassword, 10);
      const firstUser = (await prisma.user.count()) === 0;
      await prisma.user.upsert({
        where: { email },
        update: { name: user.name || user.email },
        create: {
          name: user.name || user.email,
          email,
          password,
          role: firstUser ? "ADMIN" : "CASHIER",
        },
      });
      return true;
    },
    async jwt({ token, user }) {
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
