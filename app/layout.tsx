import "./globals.css";
import { Plus_Jakarta_Sans } from "next/font/google";
import Providers from "./providers";
import AppShell from "@/components/AppShell";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
});

export const metadata = {
  title: "Anima POS - Sistem Kasir & Inventaris Toko",
  description: "Aplikasi POS kasir, manajemen faktur, stok gudang, dan laporan terpadu",
  icons: {
    icon: "/Logo.png.png",
    apple: "/Logo.png.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body className={`${plusJakartaSans.className} min-h-screen bg-[var(--background)] text-slate-900 antialiased`}>
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
