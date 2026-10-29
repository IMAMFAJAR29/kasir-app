"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Swal from "sweetalert2";
import { FcGoogle } from "react-icons/fc";
import BrandLoader from "@/components/BrandLoader";
import { hasPermission } from "@/lib/permissions";
import {
  Eye,
  EyeOff,
  Loader2,
  Mail,
  Lock,
  User,
  Zap,
  ShieldCheck,
  BarChart3,
  ArrowRight,
} from "lucide-react";

type LoginRole = "CASHIER" | "ADMIN";

export default function AuthPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const redirectTarget =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("redirect") || "/admin/dashboard"
      : "/admin/dashboard";

  // State utama
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loginRole, setLoginRole] = useState<LoginRole>(
    redirectTarget === "/pos" ? "CASHIER" : "ADMIN"
  );
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    nik: "",
    pin: "",
  });
  const loginAttemptRef = useRef(false);

  // 🚀 Redirect langsung jika user sudah login
  useEffect(() => {
    const areaModule = loginRole === "ADMIN" ? "dashboard" : "pos";
    const canOpenSelectedArea =
      (loginRole === "CASHIER"
        ? session?.user?.authMethod === "nik-pin" &&
          hasPermission(
            session?.user?.role,
            session?.user?.permissions,
            "pos",
            "view"
          )
        : hasPermission(
            session?.user?.role,
            session?.user?.permissions,
            areaModule,
            "view"
          )) ||
      (loginRole === "ADMIN" &&
        hasPermission(
        session?.user?.role,
        session?.user?.permissions,
        "systemSettings",
        "view"
        ));

    if (
      status === "authenticated" &&
      !loginAttemptRef.current &&
      canOpenSelectedArea
    ) {
      const destination =
        loginRole === "CASHIER"
          ? "/pos"
          : hasPermission(
                session?.user?.role,
                session?.user?.permissions,
                "dashboard",
                "view"
              )
            ? "/admin/dashboard"
            : "/admin/settings";
      router.replace(destination);
    }
  }, [
    loginRole,
    session?.user?.role,
    session?.user?.permissions,
    session?.user?.authMethod,
    status,
    router,
  ]);

  // ⏳ Tampilkan animasi loading saat session masih dicek
  if (status === "loading") {
    return <BrandLoader label="Memuat sesi..." />;
  }

  // 🧾 Handle input form
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  // 🔐 Proses login/register
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading || loginAttemptRef.current) return;

    if (isLogin) {
      if (
        loginRole === "CASHIER" &&
        (!/^\d{6,20}$/.test(form.nik.trim()) || !/^\d{4,12}$/.test(form.pin))
      ) {
        await Swal.fire({
          icon: "warning",
          title: "Periksa NIK dan PIN",
          text: "Masukkan NIK 6–20 digit dan PIN 4–12 digit.",
          confirmButtonColor: "#1769e0",
        });
        return;
      }
      setIsLoading(true);
      loginAttemptRef.current = true;

      try {
        const result =
          loginRole === "CASHIER"
            ? await signIn("credentials", {
                redirect: false,
                nik: form.nik.trim(),
                pin: form.pin,
                area: "cashier",
              })
            : await signIn("credentials", {
                redirect: false,
                email: form.email,
                password: form.password,
                area: "dashboard",
              });

        if (result?.ok) {
          const destination =
            redirectTarget === "/pos" || loginRole === "CASHIER"
              ? "/pos"
              : "/admin/dashboard";

          // ✅ Tunggu session benar-benar aktif sebelum redirect
          const checkSession = async () => {
            let retries = 0;
            while (retries < 10) {
              const res = await fetch("/api/auth/session");
              const data = await res.json();
              if (data?.user) {
                router.replace(destination);
                return;
              }
              await new Promise((r) => setTimeout(r, 300));
              retries++;
            }
            router.replace(destination);
          };
          await checkSession();
        } else {
          loginAttemptRef.current = false;
          Swal.fire({
            icon: "error",
            title: "Gagal Masuk",
            text:
              loginRole === "ADMIN"
                ? "Pastikan email dan password benar serta akun memiliki akses administrator."
                : "NIK/PIN tidak cocok atau akun kasir tidak aktif. Jika terlalu banyak percobaan, tunggu 15 menit.",
            confirmButtonColor: "#1769e0",
          });
        }
      } finally {
        loginAttemptRef.current = false;
        setIsLoading(false);
      }
    } else {
      // 🧩 Proses register
      setIsLoading(true);
      try {
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });

        if (res.ok) {
          Swal.fire({
            icon: "success",
            title: "Pendaftaran Berhasil",
            text: "Akun berhasil dibuat! Silakan masuk dengan akun baru Anda.",
            confirmButtonColor: "#1769e0",
          });
          setIsLogin(true);
        } else {
          const data = await res.json();
          Swal.fire({
            icon: "error",
            title: "Pendaftaran Gagal",
            text: data.error || "Gagal mendaftar akun baru",
            confirmButtonColor: "#1769e0",
          });
        }
      } finally {
        setIsLoading(false);
      }
    }
  };

  // 🔄 Ubah form antara login ↔ register
  const toggleForm = () => {
    setIsLogin(!isLogin);
    setForm({ name: "", email: "", password: "", nik: "", pin: "" });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 sm:p-6 relative overflow-hidden">
      {/* Decorative ambient light */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-200/35 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-teal-200/30 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="relative bg-white rounded-3xl shadow-xl w-full max-w-4xl flex flex-col md:flex-row overflow-hidden border border-slate-200/80 z-10"
      >
        {/* Brand panel */}
        <div className="hidden md:flex w-5/12 flex-col justify-between p-10 text-brand-navy bg-gradient-to-br from-teal-50 via-blue-50 to-white relative overflow-hidden">
          <div className="absolute -top-12 -left-12 w-48 h-48 bg-teal-300/25 rounded-full blur-2xl" />
          <div className="absolute -bottom-16 -right-12 w-52 h-52 bg-blue-300/20 rounded-full blur-3xl" />

          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-8">
              <Image
                src="/Logo.png.png"
                alt="Logo Anima POS"
                width={52}
                height={52}
                className="h-12 w-12 rounded-xl border border-white/80 bg-white object-contain shadow-sm"
                priority
              />
              <div>
                <span className="font-bold text-lg tracking-tight">
                  Anima POS
                </span>
                <span className="ml-2 text-xs font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 border border-purple-200">
                  PRO
                </span>
              </div>
            </div>

            <h1 className="text-2xl font-bold tracking-tight mb-3">
              Solusi Point of Sale & Inventaris Toko Modern
            </h1>
            <p className="text-xs text-slate-600 leading-relaxed mb-8">
              Kelola kasir transaksi cepat, monitoring stok multi-gudang, dan
              cetak struk thermal dalam satu aplikasi terintegrasi.
            </p>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-teal-100 border border-teal-200 flex items-center justify-center text-teal-700 shrink-0">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-brand-navy">
                    Transaksi Kasir Kilat
                  </p>
                  <p className="text-xs text-slate-600">
                    Pencarian produk instan & hotkey cepat
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-blue-100 border border-blue-200 flex items-center justify-center text-blue-700 shrink-0">
                  <BarChart3 className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-brand-navy">
                    Laporan & Multi Gudang
                  </p>
                  <p className="text-xs text-slate-600">
                    Tracking stok real-time per lokasi cabang
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-purple-100 border border-purple-200 flex items-center justify-center text-purple-700 shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-brand-navy">
                    Aman & Terpercaya
                  </p>
                  <p className="text-xs text-slate-600">
                    Data terlindungi enkripsi session modern
                  </p>
                </div>
              </div>
            </div>
          </div>

          {loginRole === "ADMIN" && (
          <div className="relative z-10 pt-8 border-t border-slate-200">
            <p className="text-xs text-slate-600 mb-3">
              {isLogin ? "Belum punya akun sistem?" : "Sudah memiliki akun?"}
            </p>
            <button
              onClick={toggleForm}
              className="w-full py-2.5 px-4 rounded-xl border border-blue-200 text-brand-navy hover:bg-blue-50 hover:border-blue-300 transition-all font-medium text-xs flex items-center justify-center gap-2 group"
            >
              {isLogin ? "Daftar Akun Baru" : "Masuk ke Akun"}
              <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
            </button>
          </div>
          )}
        </div>

        {/* ☀️ Right form panel */}
        <div className="w-full md:w-7/12 p-6 sm:p-10 flex flex-col justify-center bg-white">
          <div className="max-w-md mx-auto w-full">
            <div className="md:hidden flex items-center gap-3 mb-7">
              <Image
                src="/Logo.png.png"
                alt="Logo Anima POS"
                width={48}
                height={48}
                className="h-12 w-12 object-contain"
              />
              <span className="text-lg font-bold tracking-tight text-brand-navy">
                Anima POS
              </span>
            </div>
            <div className="mb-5">
              <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                {isLogin
                  ? loginRole === "ADMIN"
                    ? "Login Dashboard"
                    : "Login Kasir"
                  : "Daftar Akun Baru 🚀"}
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                {isLogin
                  ? "Masuk untuk mengelola transaksi kasir dan stok tokomu."
                  : "Akun pertama mendapat akses admin; akun berikutnya terdaftar sebagai kasir."}
              </p>
            </div>

            {isLogin && (
              <div className="mb-5 grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
                {([
                  ["ADMIN", "Login Dashboard"],
                  ["CASHIER", "Login Kasir"],
                ] as const).map(([role, label]) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => setLoginRole(role)}
                    className={`rounded-lg px-3 py-2.5 text-xs font-semibold transition ${
                      loginRole === role
                        ? "bg-white text-blue-700 shadow-sm"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}

            {/* Admin login methods */}
            {isLogin && loginRole === "ADMIN" && (
              <div className="mb-6">
                <button
                  type="button"
                  onClick={() =>
                    signIn("google", {
                      callbackUrl: "/admin/dashboard",
                    })
                  }
                  className="w-full py-2.5 px-4 border border-slate-200 rounded-xl hover:bg-slate-50 transition-all text-slate-700 font-medium text-xs sm:text-sm flex items-center justify-center gap-2.5 shadow-sm"
                >
                  <FcGoogle className="text-base" />
                  <span>Lanjutkan dengan Google</span>
                </button>

                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-3 text-slate-400 font-medium">
                      atau dengan email
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Login kasir memakai NIK/PIN; metode akun administrator tetap tersedia. */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Nama (Register only) */}
              {!isLogin && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                    Nama Lengkap
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      placeholder="Contoh: Admin Toko"
                      required
                      className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400 text-slate-900"
                    />
                  </div>
                </div>
              )}

              {isLogin && loginRole === "CASHIER" ? (
                <>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">
                      NIK
                    </label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        name="nik"
                        value={form.nik}
                        onChange={handleChange}
                        placeholder="Masukkan NIK"
                        inputMode="numeric"
                        autoComplete="username"
                        maxLength={20}
                        required
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-base text-slate-900 transition-all placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">
                      PIN
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        type={showPassword ? "text" : "password"}
                        name="pin"
                        value={form.pin}
                        onChange={handleChange}
                        placeholder="Masukkan PIN"
                        inputMode="numeric"
                        autoComplete="off"
                        maxLength={12}
                        required
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-12 text-base tracking-[0.25em] text-slate-900 transition-all placeholder:tracking-normal placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((visible) => !visible)}
                        aria-label={showPassword ? "Sembunyikan PIN" : "Tampilkan PIN"}
                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                      >
                        {showPassword ? (
                          <EyeOff className="h-5 w-5" />
                        ) : (
                          <Eye className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                  </div>
                </>
              ) : (
              <>
              {/* Email */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                  Alamat Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="nama@email.com"
                    required
                    className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400 text-slate-900"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                  Kata Sandi
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    required
                    className="w-full pl-10 pr-10 py-2.5 text-sm bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400 text-slate-900"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
              </>
              )}

              {/* Submit button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-semibold text-sm transition-all shadow-md shadow-blue-600/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
              >
                {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                {isLogin
                  ? loginRole === "ADMIN"
                    ? "Masuk ke Dashboard"
                    : "Login Kasir"
                  : "Buat Akun Sekarang"}
              </button>
            </form>

            {/* Mobile toggle */}
            {loginRole === "ADMIN" && (
            <div className="md:hidden mt-6 pt-6 border-t border-slate-100 text-center">
              <p className="text-xs text-slate-500 mb-2">
                {isLogin ? "Belum memiliki akun toko?" : "Sudah memiliki akun?"}
              </p>
              <button
                type="button"
                onClick={toggleForm}
                className="text-blue-700 font-semibold text-xs hover:underline"
              >
                {isLogin ? "Daftar Akun Baru" : "Masuk dengan akun yang ada"}
              </button>
            </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
