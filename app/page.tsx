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
    <div className="fixed inset-0 flex items-center justify-center bg-slate-900/40 backdrop-blur-md z-50">
      <div className="flex flex-col items-center gap-3 bg-white p-6 rounded-2xl shadow-xl border border-slate-200/80">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        <p className="text-xs font-semibold text-slate-600 tracking-wider">
          Memuat POS Imam...
        </p>
      </div>
    </div>
  );
}
