import "next-auth";
import "next-auth/jwt";
import type { DefaultSession } from "next-auth";
import type { UserPermissions } from "@/lib/permissions";

declare module "next-auth" {
  interface User {
    role: string;
    permissions: UserPermissions;
    isActive?: boolean;
    authMethod?: string;
  }

  interface Session {
    user: {
      id: string;
      role: string;
      permissions: UserPermissions;
      isActive: boolean;
      authMethod?: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string;
    permissions?: UserPermissions;
    isActive?: boolean;
    authMethod?: string;
  }
}
