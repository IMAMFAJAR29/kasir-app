"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import BrandLoader from "@/components/BrandLoader";
import { hasPermission } from "@/lib/permissions";

export default function HomeRedirect() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") {
      const destination = hasPermission(
        session?.user?.role,
        session?.user?.permissions,
        "dashboard",
        "view"
      )
        ? "/admin/dashboard"
        : hasPermission(
              session?.user?.role,
              session?.user?.permissions,
              "pos",
              "view"
            )
          ? "/pos"
          : "/auth";
      router.replace(destination);
    } else if (status === "unauthenticated") {
      router.replace("/auth");
    }
  }, [session?.user?.role, session?.user?.permissions, status, router]);

  return (
    <BrandLoader
      label="Memuat Anima POS..."
      className="fixed inset-0 z-50"
    />
  );
}
