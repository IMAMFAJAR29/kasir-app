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
  const roleLabel =
    role === "ADMIN" ? "Administrator" : role === "CASHIER" ? "Kasir POS" : "Administrator";

  return (
    <div className="mb-4 rounded-2xl border border-slate-200/80 bg-white px-3 py-3 shadow-sm sm:mb-5 sm:px-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
            <CircleUserRound className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
              Pengguna POS
            </p>
            <div className="flex items-center gap-2">
              <p className="truncate text-sm font-semibold text-slate-900">{name}</p>
              <span className="hidden text-xs font-medium text-slate-400 sm:inline">
                · {roleLabel}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Status online/offline */}
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
            <span
              className={`h-2 w-2 shrink-0 rounded-full ${
                online ? "bg-emerald-500" : "bg-amber-500"
              }`}
            />
            <span>{online ? "Online" : "Offline"}</span>
            {!online && <CloudOff className="h-3.5 w-3.5 text-amber-600" />}
          </div>

          {/* Role badge (mobile) */}
          <span className="rounded-md bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-600 sm:hidden">
            {roleLabel}
          </span>

          {role === "CASHIER" && (
            <button
              type="button"
              onClick={onChangePin}
              disabled={!online}
              title={!online ? "Ubah PIN memerlukan koneksi internet." : undefined}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <KeyRound className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Ubah PIN</span>
            </button>
          )}

          <button
            type="button"
            onClick={onLogout}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-rose-600 transition hover:bg-rose-50"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>
    </div>
  );
}