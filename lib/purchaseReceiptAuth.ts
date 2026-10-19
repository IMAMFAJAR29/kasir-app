import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/authOptions";
import { hasPermission, type PermissionAction } from "@/lib/permissions";

export async function authorizePurchaseReceipt(action: PermissionAction) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return {
      authorized: false as const,
      response: NextResponse.json(
        { error: "Autentikasi diperlukan" },
        { status: 401 }
      ),
    };
  }

  if (
    !hasPermission(
      session.user.role,
      session.user.permissions,
      "purchases",
      action
    )
  ) {
    return {
      authorized: false as const,
      response: NextResponse.json({ error: "Akses ditolak" }, { status: 403 }),
    };
  }

  return { authorized: true as const, user: session.user };
}
