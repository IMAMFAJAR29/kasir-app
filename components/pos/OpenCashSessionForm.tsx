import { LogOut } from "lucide-react";

interface OpenCashSessionFormProps {
  openingCash: string;
  online: boolean;
  opening: boolean;
  onOpeningCashChange: (value: string) => void;
  onOpen: (event: React.FormEvent<HTMLFormElement>) => void;
  onLogout: () => void;
}

export default function OpenCashSessionForm({
  openingCash,
  online,
  opening,
  onOpeningCashChange,
  onOpen,
  onLogout,
}: OpenCashSessionFormProps) {
  return (
    <form
      onSubmit={onOpen}
      className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-brand-navy">Buka shift kasir</h1>
          <p className="mt-1 text-sm text-slate-500">
            Catat modal awal laci kas sebelum mulai bertransaksi.
          </p>
        </div>
        <a
          href="/auth"
          onClick={(event) => {
            event.preventDefault();
            onLogout();
          }}
          className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </a>
      </div>
      <label
        className="mt-5 block text-sm font-semibold text-slate-700"
        htmlFor="opening-cash"
      >
        Modal awal (Rp)
      </label>
      <input
        id="opening-cash"
        type="number"
        min="0"
        step="1"
        inputMode="numeric"
        value={openingCash}
        onChange={(event) => onOpeningCashChange(event.target.value)}
        placeholder="0"
        className="form-control mt-1.5"
        required
      />
      {!online && (
        <p className="mt-2 text-xs text-amber-700">
          Buka shift saat online terlebih dahulu untuk mengaktifkan mode offline.
        </p>
      )}
      <button
        type="submit"
        disabled={!online || opening}
        className="mt-4 w-full rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {opening ? "Membuka shift..." : "Buka Shift"}
      </button>
    </form>
  );
}
