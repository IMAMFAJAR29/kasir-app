"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";
import { FaGoogle } from "react-icons/fa";
import {
  Eye,
  EyeOff,
  Loader2,
  Store,
  Mail,
  Lock,
  User,
  Zap,
  ShieldCheck,
  BarChart3,
  ArrowRight,
} from "lucide-react";

export default function AuthPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // State utama
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "" });

  // 🚀 Redirect langsung jika user sudah login
  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/");
    }
  }, [status, router]);

  // ⏳ Tampilkan animasi loading saat session masih dicek
  if (status === "loading") {
    return (
      <div className="flex flex-col justify-center items-center h-screen bg-slate-950 text-white gap-3">
        <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
        </div>
        <p className="text-xs text-slate-400 tracking-wider font-medium">
          Memuat sesi...
        </p>
      </div>
    );
  }

  // 🧾 Handle input form
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  // 🔐 Proses login/register
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isLogin) {
      setIsLoading(true);

      try {
        const result = await signIn("credentials", {
          redirect: false,
          email: form.email,
          password: form.password,
        });

        if (result?.ok) {
          // ✅ Tunggu session benar-benar aktif sebelum redirect
          const checkSession = async () => {
            let retries = 0;
            while (retries < 10) {
              const res = await fetch("/api/auth/session");
              const data = await res.json();
              if (data?.user) {
                router.replace("/");
                return;
              }
              await new Promise((r) => setTimeout(r, 300));
              retries++;
            }
            router.replace("/");
          };
          await checkSession();
        } else {
          Swal.fire({
            icon: "error",
            title: "Gagal Masuk",
            text: "Email atau password yang Anda masukkan salah.",
            confirmButtonColor: "#4f46e5",
          });
        }
      } finally {
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
            confirmButtonColor: "#4f46e5",
          });
          setIsLogin(true);
        } else {
          const data = await res.json();
          Swal.fire({
            icon: "error",
            title: "Pendaftaran Gagal",
            text: data.error || "Gagal mendaftar akun baru",
            confirmButtonColor: "#4f46e5",
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
    setForm({ name: "", email: "", password: "" });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4 sm:p-6 relative overflow-hidden">
      {/* Decorative ambient light */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="relative bg-white rounded-3xl shadow-2xl w-full max-w-4xl flex flex-col md:flex-row overflow-hidden border border-slate-200/60 z-10"
      >
        {/* 🌑 Left brand panel */}
        <div className="hidden md:flex w-5/12 flex-col justify-between p-10 text-white bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 relative overflow-hidden">
          {/* Subtle background glow inside left panel */}
          <div className="absolute -top-12 -left-12 w-48 h-48 bg-indigo-500/20 rounded-full blur-2xl" />

          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/40 text-white">
                <Store className="w-5 h-5" />
              </div>
              <div>
                <span className="font-bold text-lg tracking-tight">
                  POS IMAM
                </span>
                <span className="ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-500/30 text-indigo-300 border border-indigo-400/30">
                  PRO
                </span>
              </div>
            </div>

            <h1 className="text-2xl font-bold tracking-tight mb-3">
              Solusi Point of Sale & Inventaris Toko Modern
            </h1>
            <p className="text-xs text-slate-400 leading-relaxed mb-8">
              Kelola kasir transaksi cepat, monitoring stok multi-gudang, dan
              cetak struk thermal dalam satu aplikasi terintegrasi.
            </p>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-200">
                    Transaksi Kasir Kilat
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Pencarian produk instan & hotkey cepat
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
                  <BarChart3 className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-200">
                    Laporan & Multi Gudang
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Tracking stok real-time per lokasi cabang
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-200">
                    Aman & Terpercaya
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Data terlindungi enkripsi session modern
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="relative z-10 pt-8 border-t border-slate-800/80">
            <p className="text-xs text-slate-400 mb-3">
              {isLogin ? "Belum punya akun sistem?" : "Sudah memiliki akun?"}
            </p>
            <button
              onClick={toggleForm}
              className="w-full py-2.5 px-4 rounded-xl border border-slate-700 text-slate-200 hover:bg-white hover:text-slate-900 transition-all font-medium text-xs flex items-center justify-center gap-2 group"
            >
              {isLogin ? "Daftar Akun Baru" : "Masuk ke Akun"}
              <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
            </button>
          </div>
        </div>

        {/* ☀️ Right form panel */}
        <div className="w-full md:w-7/12 p-8 sm:p-10 flex flex-col justify-center bg-white">
          <div className="max-w-md mx-auto w-full">
            <div className="mb-6">
              <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                {isLogin ? "Selamat Datang Kembali" : "Daftar Akun Baru 🚀"}
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                {isLogin
                  ? "Masuk untuk mengelola transaksi kasir dan stok tokomu."
                  : "Buat akun operator atau admin untuk mulai bertransaksi."}
              </p>
            </div>

            {/* 🔘 Google OAuth Button */}
            {isLogin && (
              <div className="mb-6">
                <button
                  type="button"
                  onClick={() => signIn("google", { callbackUrl: "/" })}
                  className="w-full py-2.5 px-4 border border-slate-200 rounded-xl hover:bg-slate-50 transition-all text-slate-700 font-medium text-xs sm:text-sm flex items-center justify-center gap-2.5 shadow-sm"
                >
                  <FaGoogle className="text-red-500 text-base" />
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

            {/* 🧩 Form login/register */}
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
                      className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400 text-slate-900"
                    />
                  </div>
                </div>
              )}

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
                    className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400 text-slate-900"
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
                    className="w-full pl-10 pr-10 py-2.5 text-sm bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400 text-slate-900"
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

              {/* Submit button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white font-semibold text-sm transition-all shadow-md shadow-indigo-600/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
              >
                {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                {isLogin ? "Masuk ke Sistem" : "Buat Akun Sekarang"}
              </button>
            </form>

            {/* Mobile toggle */}
            <div className="md:hidden mt-6 pt-6 border-t border-slate-100 text-center">
              <p className="text-xs text-slate-500 mb-2">
                {isLogin ? "Belum memiliki akun toko?" : "Sudah memiliki akun?"}
              </p>
              <button
                type="button"
                onClick={toggleForm}
                className="text-indigo-600 font-semibold text-xs hover:underline"
              >
                {isLogin ? "Daftar Akun Baru" : "Masuk dengan akun yang ada"}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
