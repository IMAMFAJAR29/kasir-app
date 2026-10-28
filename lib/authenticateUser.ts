import bcrypt from "bcrypt";
import prisma from "@/lib/prisma";
import { hasPermission, type UserPermissions } from "@/lib/permissions";

export interface AuthenticatedUser {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
  permissions: UserPermissions;
  isActive: boolean;
}

export type PasswordAuthResult =
  | { ok: true; user: AuthenticatedUser }
  | { ok: false; reason: "invalid"; accountExists: boolean }
  | { ok: false; reason: "forbidden" };

/**
 * Validasi login berbasis email + password langsung ke database.
 * Tidak menggunakan HTTP self-call agar lebih stabil & aman.
 */
export async function authenticatePasswordUser(
  email: string,
  password: string,
  expectedArea: "dashboard" | "pos"
): Promise<PasswordAuthResult> {
  const user = await prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
  });

  if (!user || !user.isActive || user.role !== "ADMIN") {
    return { ok: false, reason: "invalid", accountExists: !!user };
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    return { ok: false, reason: "invalid", accountExists: true };
  }

  const userPermissions = user.permissions as UserPermissions;
  const canUseSelectedLogin =
    hasPermission(
      user.role,
      userPermissions,
      expectedArea === "dashboard" ? "dashboard" : "pos",
      "view"
    ) ||
    (expectedArea === "dashboard" &&
      hasPermission(user.role, userPermissions, "systemSettings", "view"));

  if (!canUseSelectedLogin) {
    return { ok: false, reason: "forbidden" };
  }

  return {
    ok: true,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      permissions: userPermissions,
      isActive: user.isActive,
    },
  };
}