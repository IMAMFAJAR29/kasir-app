import "./globals.css";
import { Inter } from "next/font/google";
import { headers } from "next/headers";
import Providers from "./providers";
import Navbar from "@/components/Navbar";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "POS IMAM - Sistem Kasir & Inventaris Toko",
  description: "Aplikasi POS kasir, manajemen faktur, stok gudang, dan laporan terpadu",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headerList = await headers();
  const pathname = headerList.get("x-invoke-path") || "";

  const hideNavbar =
    pathname.startsWith("/auth") || pathname.startsWith("/login");

  return (
    <html lang="id">
      <body className={`${inter.className} min-h-screen bg-[var(--background)] text-slate-900 antialiased`}>
        <Providers>
          {!hideNavbar && <Navbar />}
          <main className={hideNavbar ? "" : "pt-16 min-h-screen"}>
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
