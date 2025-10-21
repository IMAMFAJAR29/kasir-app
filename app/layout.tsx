import "./globals.css";
import { Inter } from "next/font/google";
import { headers } from "next/headers";
import Providers from "./providers";
import Navbar from "@/components/Navbar";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "POS IMAM",
  description: "POS TERBAIK",
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
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          {!hideNavbar && <Navbar />}{" "}
          {/* ✅ tampilkan jika bukan halaman auth */}
          <main className="pt-16">{children}</main>{" "}
          {/* beri padding biar ga ketutup navbar */}
        </Providers>
      </body>
    </html>
  );
}
