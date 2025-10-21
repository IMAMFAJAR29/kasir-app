import React from "react";

export const metadata = {
  title: "Print Invoice",
};

export default function PrintLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // layout bersih tanpa navbar
    <div className="min-h-screen bg-white text-black">{children}</div>
  );
}
