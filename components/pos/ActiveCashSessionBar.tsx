import { LogOut } from "lucide-react";

interface ActiveCashSessionBarProps {
  openingCash: number;
  expectedCash: number;
  pendingSales: number;
  online: boolean;
  closing: boolean;
  onClose: () => void;
  onLogout: () => void;
}

const currency = (amount: number) => amount.toLocaleString("id-ID");

export default function ActiveCashSessionBar({
  openingCash,
  expectedCash,
  pendingSales,
  online,
  closing,
  onClose,
  onLogout,
}: ActiveCashSessionBarProps) {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-teal-200 bg-teal-50/70 px-4 py-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-teal-800">
          Shift aktif
        </p>
        <p className="mt-0.5 text-sm font-semibold text-brand-navy">
          Modal awal Rp {currency(openingCash)} · Kas diharapkan Rp{" "}
          {currency(expectedCash)}
        </p>
        {pendingSales > 0 && (
          <p className="mt-1 text-xs font-medium text-amber-800">
            {pendingSales} transaksi menunggu sinkronisasi
          </p>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onClose}
          disabled={!online || pendingSales > 0 || closing}
          className="rounded-lg border border-teal-300 bg-white px-3 py-2 text-xs font-semibold text-teal-800 transition hover:bg-teal-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {closing ? "Menutup..." : "Tutup Shift / Setor"}
        </button>
        <a
          href="/auth"
          onClick={(event) => {
            event.preventDefault();
            onLogout();
          }}
          className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-50"
        >
          <LogOut className="h-3.5 w-3.5" />
          Logout
        </a>
      </div>
    </div>
  );
}
