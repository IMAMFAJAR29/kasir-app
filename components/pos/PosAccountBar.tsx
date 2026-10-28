import { CircleUserRound, KeyRound, LogOut } from "lucide-react";

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
            className={`inline-flex h-9 min-w-[84px] items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-3 text-xs font-semibold ${
              online ? "bg-teal-50 text-teal-700" : "bg-amber-50 text-amber-800"
            }`}
          >
            <span
              className={`h-2 w-2 shrink-0 rounded-full ${
                online ? "bg-teal-500" : "bg-amber-500"
              }`}
            />
            {online ? "Online" : "Offline"}
          </span>
          <span className="inline-flex h-9 min-w-[84px] items-center justify-center whitespace-nowrap rounded-full bg-blue-50 px-3 text-xs font-semibold text-blue-700">
            {role === "ADMIN" ? "Administrator" : role === "CASHIER" ? "Kasir POS" : "Administrator"}
          </span>
          {role === "CASHIER" && (
            <button
              type="button"
              onClick={onChangePin}
              disabled={!online}
              title={!online ? "Ubah PIN memerlukan koneksi internet." : undefined}
              className="inline-flex h-9 min-w-[84px] shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-full border border-blue-100 bg-blue-50 px-3 text-xs font-semibold text-blue-700 transition hover:border-blue-200 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <KeyRound className="h-3.5 w-3.5" />
              Ubah PIN
            </button>
          )}
          <a
            href="/auth"
            onClick={(event) => {
              event.preventDefault();
              onLogout();
            }}
            className="inline-flex h-9 min-w-[84px] shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-full border border-rose-200 bg-rose-50 px-3 text-xs font-semibold text-rose-700 transition hover:border-rose-300 hover:bg-rose-100"
          >
            <LogOut className="h-3.5 w-3.5" />
            Logout
          </a>
        </div>
      </div>
    </div>
  );
}
