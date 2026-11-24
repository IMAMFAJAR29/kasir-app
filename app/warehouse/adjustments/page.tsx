import { redirect } from "next/navigation";

// Riwayat penyesuaian kini menjadi bagian modul Persediaan.
export default function LegacyAdjustmentsPage() {
  redirect("/inventory/adjustments");
}
