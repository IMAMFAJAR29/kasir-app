import Link from "next/link";
import { HandCoins, UserRoundCog } from "lucide-react";

const settingItems = [
  {
    href: "/admin/settings/accounts",
    title: "Pengguna & Hak Akses",
    description: "Buat pengguna Administrator atau Kasir POS dan tentukan izin setiap modul.",
    icon: UserRoundCog,
    color: "bg-blue-50 text-blue-700",
  },
  {
    href: "/admin/settings/reconciliation",
    title: "Setoran & Rekonsiliasi Kas",
    description: "Tinjau shift kasir, kas yang diharapkan, uang fisik, dan selisih.",
    icon: HandCoins,
    color: "bg-teal-50 text-teal-700",
  },
];

export default function SystemSettingsPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-5 px-4 py-6 sm:px-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-brand-navy">
          Pengaturan Sistem
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Kelola pengguna, hak akses, dan rekonsiliasi kas.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {settingItems.map(({ href, title, description, icon: Icon, color }) => (
          <Link
            key={href}
            href={href}
            className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-200 hover:shadow-md"
          >
            <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl ${color}`}>
              <Icon className="h-5 w-5" />
            </div>
            <h2 className="font-semibold text-brand-navy group-hover:text-blue-700">
              {title}
            </h2>
            <p className="mt-1 text-sm text-slate-500">{description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
