"use client";

import { usePathname } from "next/navigation";
import Navbar from "@/components/Navbar";

export default function AppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const hideNavbar =
    pathname.startsWith("/auth") ||
    pathname.startsWith("/login") ||
    pathname === "/pos" ||
    pathname.startsWith("/pos/");

  return (
    <>
      {!hideNavbar && <Navbar />}
      <main className={hideNavbar ? "min-h-screen" : "min-h-screen pt-16"}>
        {children}
      </main>
    </>
  );
}
