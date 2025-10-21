"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Loader2 } from "lucide-react";

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
    <div className="fixed inset-0 flex items-center justify-center bg-white/70 backdrop-blur-sm z-50">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-10 h-10 text-black animate-spin" />
        <p className="text-gray-600 font-medium">
          {status === "loading" ? "" : ""}
        </p>
      </div>
    </div>
  );
}
