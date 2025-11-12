import React from "react";

export const metadata = {
  title: "Print Pembelian Barang",
};

export default function PurchasePrintLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // Layout clean tanpa navbar/sidebar
    <div className="min-h-screen bg-white text-black print:bg-white">
      {children}
    </div>
  );
}
