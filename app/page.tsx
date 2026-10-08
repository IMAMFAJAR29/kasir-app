"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import BrandLoader from "@/components/BrandLoader";

export default function HomeRedirect() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") {
      // Kalau sudah login, langsung ke dashboard
      router.push("/admin/dashboard");
    } else if (status === "unauthenticated") {
      // Kalau belum login, ke halaman auth
      router.push("/auth");
    }
  }, [status, router]);

  return (
    <BrandLoader
      label="Memuat Anima POS..."
      className="fixed inset-0 z-50"
    />
  );
}
