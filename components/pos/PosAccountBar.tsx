import { CircleUserRound, CloudOff, KeyRound, LogOut } from "lucide-react";

interface PosAccountBarProps {
  name: string;
  role: string;
  online: boolean;
  onLogout: () => void;
  onChangePin: () => void;
}

export default function PosAccountBar({
  name,
  role,
  online,
  onLogout,
  onChangePin,
}: PosAccountBarProps) {
  return (
    <div className="mb-4 rounded-2xl border border-slate-200/80 bg-white px-3 py-3 shadow-sm sm:mb-5 sm:px-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
            <CircleUserRound className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
              Pengguna POS
            </p>
            <p className="truncate text-sm font-semibold text-brand-navy">{name}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
              online ? "bg-teal-50 text-teal-700" : "bg-amber-50 text-amber-800"
            }`}
          >
            {online ? "Online" : <><CloudOff className="h-3.5 w-3.5" /> Offline</>}
          </span>
          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
            {role === "ADMIN" ? "Administrator" : role === "CASHIER" ? "Kasir POS" : "Administrator"}
          </span>
          {role === "CASHIER" && (
            <button
              type="button"
              onClick={onChangePin}
              disabled={!online}
              title={!online ? "Ubah PIN memerlukan koneksi internet." : undefined}
              className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <KeyRound className="h-4 w-4" />
              Ubah PIN
            </button>
          )}
          <a
            href="/auth"
            onClick={(event) => {
              event.preventDefault();
              onLogout();
            }}
            className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2 text-sm font-semibold text-rose-700 transition hover:border-rose-300 hover:bg-rose-100"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </a>
        </div>
      </div>
    </div>
  );
}
