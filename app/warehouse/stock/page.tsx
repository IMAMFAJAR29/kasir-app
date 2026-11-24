import { redirect } from "next/navigation";

// Stok produk kini menjadi bagian modul Persediaan.
export default function LegacyStockPage() {
  redirect("/inventory/stock");
}
